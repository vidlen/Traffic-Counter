import { t } from '../i18n/id';
import type {
  IntervalRecord,
  IntervalStatus,
  Movement,
  NoteEvent,
  PeakPeriod,
  Session,
  VehicleType,
} from '../types';
import { countKey, ekrComplete, type Flow, flowsOf } from './session';
import { fmtTime, parseHm } from './time';

// Rekap (fungsi murni, BRIEF §10). null = kosong (bukan 0): interval TERLEWAT, atau skr saat ekr belum lengkap.

export type Basis = 'kend' | 'skr';

export interface Vol {
  kend: number | null;
  skr: number | null;
}

export interface FlowVol extends Vol {
  byType: Record<string, number | null>;
}

export interface IntervalRow {
  index: number;
  start: number;
  end: number;
  status: IntervalStatus;
  blockLabel?: string;
  byFlow: Record<string, FlowVol>;
  total: FlowVol;
  notes: NoteEvent[];
}

/** Gabungan beberapa interval: jam bulat atau jam bergerak. */
export interface WindowRow {
  start: number;
  end: number;
  label: string;
  rows: IntervalRow[];
  byFlow: Record<string, Vol>;
  total: Vol;
  vMax: Vol; // volume interval tertinggi (Total) di dalam jendela
  valid: boolean; // n interval, semua LENGKAP, berurutan tanpa celah
}

export interface Peak {
  label: string; // nama periode / "Keseluruhan"
  win: WindowRow | null;
  incomplete: boolean; // tidak ada jam valid di periode ini → dipilih dari semua jam
  phf: number | null;
}

const HOUR = 3_600_000;

/** Jumlah yang menghormati "kosong": null + null = null, null + x = x. */
export const addN = (a: number | null, b: number | null) =>
  a === null && b === null ? null : (a ?? 0) + (b ?? 0);
const sumN = (xs: (number | null)[]) => xs.reduce<number | null>(addN, null);
const maxN = (xs: (number | null)[]) =>
  xs.reduce<number | null>((m, x) => (x === null ? m : m === null ? x : Math.max(m, x)), null);

/** skr = Σ jumlah × ekr untuk jenis yang masuk skr; null bila ada ekr yang belum diisi. */
export function skrOf(byType: Record<string, number | null>, types: VehicleType[]): number | null {
  if (!types.every((v) => !v.inSkr || v.ekr !== null)) return null;
  if (types.every((v) => byType[v.code] === null || byType[v.code] === undefined)) return null;
  return types.reduce((a, v) => a + (v.inSkr ? (byType[v.code] ?? 0) * (v.ekr ?? 0) : 0), 0);
}

function flowVol(byType: Record<string, number | null>, types: VehicleType[]): FlowVol {
  return { byType, kend: sumN(types.map((v) => byType[v.code])), skr: skrOf(byType, types) };
}

export function intervalRows(
  s: Pick<Session, 'surveyType' | 'positions' | 'countedKeys' | 'classification'>,
  intervals: IntervalRecord[],
  notes: NoteEvent[] = [],
): IntervalRow[] {
  const flows = flowsOf(s);
  const types = s.classification.vehicleTypes;
  return intervals
    .filter((r) => r.status !== 'TERBUKA')
    .sort((a, b) => a.start - b.start)
    .map((r) => {
      const missing = r.status === 'TERLEWAT';
      const byFlow: Record<string, FlowVol> = {};
      for (const f of flows) {
        const byType = Object.fromEntries(
          types.map((v) => [
            v.code,
            missing ? null : (r.counts[countKey(f.positionKey, f.movement, v.code)] ?? 0),
          ]),
        );
        byFlow[f.key] = flowVol(byType, types);
      }
      const totalByType = Object.fromEntries(
        types.map((v) => [v.code, sumN(flows.map((f) => byFlow[f.key].byType[v.code]))]),
      );
      return {
        index: r.index,
        start: r.start,
        end: r.end,
        status: r.status,
        blockLabel: r.blockLabel,
        byFlow,
        total: flowVol(totalByType, types),
        notes: notes.filter((x) => x.t >= r.start && x.t < r.end),
      };
    });
}

function windowOf(rows: IntervalRow[], flows: Flow[], label: string, valid: boolean): WindowRow {
  const byFlow: Record<string, Vol> = {};
  for (const f of flows) {
    byFlow[f.key] = {
      kend: sumN(rows.map((r) => r.byFlow[f.key].kend)),
      skr: sumN(rows.map((r) => r.byFlow[f.key].skr)),
    };
  }
  return {
    start: rows[0].start,
    end: rows[rows.length - 1].end,
    label,
    rows,
    byFlow,
    total: {
      kend: sumN(rows.map((r) => r.total.kend)),
      skr: sumN(rows.map((r) => r.total.skr)),
    },
    vMax: {
      kend: maxN(rows.map((r) => r.total.kend)),
      skr: maxN(rows.map((r) => r.total.skr)),
    },
    valid,
  };
}

const contiguous = (rows: IntervalRow[]) => rows.every((r, i) => !i || r.start === rows[i - 1].end);
const allComplete = (rows: IntervalRow[]) => rows.every((r) => r.status === 'LENGKAP');

/** Jam bulat: interval dikelompokkan per jam jam-dinding tempat interval dimulai. */
export function hourly(rows: IntervalRow[], flows: Flow[], intervalMin: number): WindowRow[] {
  const n = 60 / intervalMin;
  const groups = new Map<number, IntervalRow[]>();
  for (const r of rows) {
    const h = new Date(r.start).setMinutes(0, 0, 0);
    groups.set(h, [...(groups.get(h) ?? []), r]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([h, rs]) => {
      const valid = rs.length === n && rs[0].start === h && allComplete(rs) && contiguous(rs);
      return windowOf(rs, flows, `${fmtTime(h)}-${fmtTime(h + HOUR)}`, valid);
    });
}

/** Jam bergerak: jendela n interval berurutan (hanya bila n > 1). */
export function moving(rows: IntervalRow[], flows: Flow[], intervalMin: number): WindowRow[] {
  const n = 60 / intervalMin;
  if (n <= 1) return [];
  const out: WindowRow[] = [];
  for (let i = 0; i + n <= rows.length; i++) {
    const rs = rows.slice(i, i + n);
    const label = `${fmtTime(rs[0].start)}-${fmtTime(rs[n - 1].end)}`;
    out.push(windowOf(rs, flows, label, allComplete(rs) && contiguous(rs)));
  }
  return out;
}

export function phf(win: WindowRow, intervalMin: number, basis: Basis): number | null {
  const n = 60 / intervalMin;
  const v = win.total[basis];
  const vMax = win.vMax[basis];
  return n > 1 && v !== null && vMax ? v / (n * vMax) : null;
}

/** Jam mulai (menit sejak 00.00) jatuh di periode? Periode boleh lewat tengah malam. */
export function inPeriod(ms: number, p: PeakPeriod): boolean {
  const d = new Date(ms);
  const m = d.getHours() * 60 + d.getMinutes();
  const a = parseHm(p.start);
  const b = parseHm(p.end);
  if (a === null || b === null || a === b) return true;
  return a < b ? m >= a && m < b : m >= a || m < b;
}

function pick(cands: WindowRow[], basis: Basis): WindowRow | null {
  let best: WindowRow | null = null;
  for (const c of cands) {
    const v = c.total[basis];
    if (v !== null && (best === null || v > (best.total[basis] ?? -Infinity))) best = c; // seri → paling awal
  }
  return best;
}

/**
 * Jam puncak per periode + keseluruhan dari Total. Kandidat = jam bergerak (n > 1) atau
 * jam bulat (interval 60 menit). Jam tidak valid dipakai hanya bila tidak ada yang valid.
 */
export function peaks(
  cands: WindowRow[],
  periods: PeakPeriod[],
  basis: Basis,
  intervalMin: number,
): Peak[] {
  const groups: [string, WindowRow[]][] = [
    ...periods.map(
      (p) => [p.label, cands.filter((c) => inPeriod(c.start, p))] as [string, WindowRow[]],
    ),
    [t.recap.overall, cands],
  ];
  return groups.map(([label, list]) => {
    const valid = list.filter((c) => c.valid);
    const win = pick(valid.length ? valid : list, basis);
    return {
      label,
      win,
      incomplete: !!win && !valid.length,
      phf: win ? phf(win, intervalMin, basis) : null,
    };
  });
}

/** Komposisi % per jenis dari jumlah per jenis (null bila total 0/kosong). */
export function composition(
  byType: Record<string, number | null>,
  types: VehicleType[],
): Record<string, number | null> {
  const total = sumN(types.map((v) => byType[v.code] ?? null));
  return Object.fromEntries(
    types.map((v) => [v.code, total ? ((byType[v.code] ?? 0) / total) * 100 : null]),
  );
}

/** Jumlah per jenis (Total atau satu aliran) sepanjang beberapa interval. */
export function typeTotals(
  rows: IntervalRow[],
  types: VehicleType[],
  flowKey?: string,
): Record<string, number | null> {
  return Object.fromEntries(
    types.map((v) => [
      v.code,
      sumN(rows.map((r) => (flowKey ? r.byFlow[flowKey] : r.total).byType[v.code])),
    ]),
  );
}

/** Rasio belok simpang pada satu jendela (basis skr): pLT = qLT / qTotal, pRT = qRT / qTotal. */
export function turnRatios(win: WindowRow, flows: Flow[]): Record<'LT' | 'RT', number | null> {
  const total = win.total.skr;
  const q = (m: Movement) => {
    const f = flows.find((x) => x.movement === m);
    const v = f ? win.byFlow[f.key].skr : null;
    return total && v !== null ? v / total : null;
  };
  return { LT: q('LT'), RT: q('RT') };
}

/** Semua rekap satu sesi, dipakai layar Rekap dan builder Excel. */
export function recap(
  s: Session,
  intervals: IntervalRecord[],
  notes: NoteEvent[],
  periods: PeakPeriod[],
  basis: Basis,
) {
  const flows = flowsOf(s);
  const types = s.classification.vehicleTypes;
  const rows = intervalRows(s, intervals, notes);
  const hours = hourly(rows, flows, s.intervalMin);
  const moves = moving(rows, flows, s.intervalMin);
  const cands = s.intervalMin === 60 ? hours : moves;
  const effBasis: Basis = basis === 'skr' && ekrComplete(s) ? 'skr' : 'kend';
  return {
    flows,
    types,
    rows,
    hours,
    moves,
    basis: effBasis,
    peaks: peaks(cands, periods, effBasis, s.intervalMin),
  };
}
