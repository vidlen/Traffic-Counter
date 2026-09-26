import { describe, expect, it } from 'vitest';
import type { IntervalRecord, IntervalStatus, Session } from '../types';
import {
  composition,
  hourly,
  inPeriod,
  intervalRows,
  moving,
  peaks,
  phf,
  recap,
  skrOf,
  turnRatios,
  typeTotals,
} from './aggregate';
import { PRESETS } from './presets';
import { flowsOf } from './session';

const at = (h: number, m = 0) => new Date(2026, 0, 5, h, m).getTime();
const MIN = 60_000;
const EKR: Record<string, number | null> = {
  SM: 0.25,
  MP: 1,
  KS: 1.2,
  BB: 1.3,
  TB: 1.8,
  KTB: null,
};

function session(over: Partial<Session> = {}): Session {
  const tpl = structuredClone(PRESETS[0]);
  tpl.vehicleTypes = tpl.vehicleTypes.map((v) => ({ ...v, ekr: EKR[v.code] }));
  return {
    id: 's',
    project: '',
    location: 'L',
    surveyor: 'S',
    date: '2026-01-05',
    surveyType: 'RUAS',
    positions: [
      { key: 'A', label: 'Arah A', movements: null },
      { key: 'B', label: 'Arah B', movements: null },
    ],
    countedKeys: ['A', 'B'],
    classification: tpl,
    intervalMin: 15,
    timerMode: 'MENERUS',
    schedule: { kind: 'SEKARANG', alignToClock: true, count: 4 },
    status: 'SELESAI',
    gaps: [],
    testMode: false,
    createdAt: 0,
    ...over,
  };
}

/** Interval ke-i mulai `start`, jumlah per key `A|-|SM` dst. */
function iv(
  index: number,
  start: number,
  counts: Record<string, number>,
  status: IntervalStatus = 'LENGKAP',
  minutes = 15,
): IntervalRecord {
  return {
    sessionId: 's',
    index,
    start,
    end: start + minutes * MIN,
    actualStart: start,
    actualEnd: start + minutes * MIN,
    status,
    gapMs: 0,
    counts: status === 'TERLEWAT' ? {} : counts,
  };
}

/** n interval berurutan mulai `from`; total SM di arah A per interval diberikan. */
const series = (from: number, sm: number[], minutes = 15, status?: (i: number) => IntervalStatus) =>
  sm.map((x, i) =>
    iv(i + 1, from + i * minutes * MIN, { 'A|-|SM': x }, status?.(i) ?? 'LENGKAP', minutes),
  );

describe('skr', () => {
  const s = session();
  const types = s.classification.vehicleTypes;

  it('skr dengan ekr lengkap; KTB tidak masuk skr', () => {
    const [row] = intervalRows(s, [iv(1, at(7), { 'A|-|SM': 4, 'A|-|MP': 2, 'A|-|KTB': 3 })]);
    expect(row.byFlow['A|-']).toMatchObject({ kend: 9, skr: 3 }); // 4×0,25 + 2×1
    expect(row.byFlow['B|-']).toMatchObject({ kend: 0, skr: 0 });
    expect(row.total).toMatchObject({ kend: 9, skr: 3 });
  });

  it('skr kosong bila ada ekr kosong (walau jumlah jenis itu 0)', () => {
    const noKs = types.map((v) => (v.code === 'KS' ? { ...v, ekr: null } : v));
    expect(skrOf({ SM: 4, MP: 2, KS: 0, BB: 0, TB: 0, KTB: 0 }, noKs)).toBeNull();
    expect(skrOf({ SM: 4, MP: 2, KS: 0, BB: 0, TB: 0, KTB: 0 }, types)).toBe(3);
  });

  it('interval TERLEWAT kosong, bukan 0', () => {
    const [row] = intervalRows(s, [iv(1, at(7), {}, 'TERLEWAT')]);
    expect(row.total.kend).toBeNull();
    expect(row.total.skr).toBeNull();
    expect(row.byFlow['A|-'].byType.SM).toBeNull();
  });
});

describe('jam bulat & jam bergerak', () => {
  const s = session();
  const flows = flowsOf(s);

  it('n = 4 (15 menit): 8 interval → 5 jam bergerak; jam bulat valid bila lengkap & tepat jam', () => {
    const rows = intervalRows(s, series(at(6), [10, 20, 30, 40, 50, 60, 70, 80]));
    const mv = moving(rows, flows, 15);
    expect(mv.map((w) => [w.label, w.total.kend])).toEqual([
      ['06.00-07.00', 100],
      ['06.15-07.15', 140],
      ['06.30-07.30', 180],
      ['06.45-07.45', 220],
      ['07.00-08.00', 260],
    ]);
    const h = hourly(rows, flows, 15);
    expect(h.map((w) => [w.label, w.total.kend, w.valid])).toEqual([
      ['06.00-07.00', 100, true],
      ['07.00-08.00', 260, true],
    ]);
  });

  it('n = 12 (5 menit): 24 interval → 13 jam bergerak', () => {
    const rows = intervalRows(
      s,
      series(
        at(6),
        Array.from({ length: 24 }, () => 5),
        5,
      ),
    );
    const mv = moving(rows, flows, 5);
    expect(mv).toHaveLength(13);
    expect(mv[0].total.kend).toBe(60);
    expect(mv[12].label).toBe('07.00-08.00');
  });

  it('interval 60 menit: tidak ada jam bergerak, jam bulat per interval', () => {
    const rows = intervalRows(s, series(at(6), [100, 200], 60));
    expect(moving(rows, flows, 60)).toEqual([]);
    expect(hourly(rows, flows, 60).map((w) => w.total.kend)).toEqual([100, 200]);
  });

  it('tidak valid bila ada interval tidak LENGKAP, ada celah waktu, atau tidak tepat jam', () => {
    const rows = intervalRows(
      s,
      series(at(6), [1, 1, 1, 1, 1], 15, (i) => (i === 1 ? 'PARSIAL' : 'LENGKAP')),
    );
    const mv = moving(rows, flows, 15);
    expect(mv.map((w) => w.valid)).toEqual([false, false]);
    const gap = intervalRows(s, [...series(at(6), [1, 1]), ...series(at(9), [1, 1])]);
    expect(moving(gap, flows, 15)[0].valid).toBe(false);
    const off = intervalRows(s, series(at(6, 5), [1, 1, 1, 1]));
    expect(hourly(off, flows, 15)[0].valid).toBe(false);
    // TERLEWAT tidak dihitung sebagai nol: jumlah jam hanya dari interval yang ada.
    const skip = intervalRows(
      s,
      series(at(6), [10, 10, 10, 10], 15, (i) => (i === 3 ? 'TERLEWAT' : 'LENGKAP')),
    );
    expect(hourly(skip, flows, 15)[0]).toMatchObject({ valid: false, total: { kend: 30 } });
  });
});

describe('jam puncak & PHF', () => {
  const s = session();
  const flows = flowsOf(s);
  const periods = [
    { label: 'Pagi', start: '05:00', end: '10:00' },
    { label: 'Siang', start: '10:00', end: '15:00' },
    { label: 'Malam', start: '19:00', end: '05:00' },
  ];

  it('PHF contoh brief: V_jam 1.200, V_max 360, n = 4 → 0,833', () => {
    const rows = intervalRows(s, series(at(7), [360, 300, 280, 260]));
    const [w] = moving(rows, flows, 15);
    expect(w.total.kend).toBe(1200);
    expect(w.vMax.kend).toBe(360);
    expect(phf(w, 15, 'kend')).toBeCloseTo(0.8333, 4);
    expect(phf(w, 60, 'kend')).toBeNull();
  });

  it('per periode; seri → paling awal; jam tidak valid dikecualikan', () => {
    // Pagi 06.00-08.00: dua jam bergerak bernilai sama (seri) di 06.00 dan 07.00.
    const rows = intervalRows(s, [
      ...series(at(6), [10, 10, 10, 10, 10, 10, 10, 10]),
      // Siang: jam 11.00 lebih besar tapi mengandung PARSIAL → tidak dipilih.
      ...series(at(11), [5, 5, 5, 5, 99, 1, 1, 1], 15, (i) =>
        i === 4 ? 'PARSIAL' : 'LENGKAP',
      ).map((x) => ({ ...x, index: x.index + 8 })),
    ]);
    const res = peaks(moving(rows, flows, 15), periods, 'kend', 15);
    const pagi = res.find((p) => p.label === 'Pagi')!;
    expect(pagi.win?.label).toBe('06.00-07.00');
    expect(pagi.incomplete).toBe(false);
    const siang = res.find((p) => p.label === 'Siang')!;
    expect(siang.win?.label).toBe('11.00-12.00');
    expect(siang.win?.total.kend).toBe(20);
    expect(res.find((p) => p.label === 'Malam')!.win).toBeNull();
    // Keseluruhan: valid terbesar 40 (pagi) > 20 (siang); seri di pagi → paling awal.
    expect(res.at(-1)!.win?.label).toBe('06.00-07.00');
  });

  it('bila tidak ada jam valid, pakai semua dan beri tanda', () => {
    const rows = intervalRows(
      s,
      series(at(20), [5, 5, 5, 5, 9], 15, () => 'TERPUTUS'),
    );
    const malam = peaks(moving(rows, flows, 15), periods, 'kend', 15).find(
      (p) => p.label === 'Malam',
    )!;
    expect(malam.incomplete).toBe(true);
    expect(malam.win?.label).toBe('20.15-21.15');
  });

  it('periode lewat tengah malam', () => {
    const malam = periods[2];
    expect(inPeriod(at(23), malam)).toBe(true);
    expect(inPeriod(new Date(2026, 0, 6, 4, 59).getTime(), malam)).toBe(true);
    expect(inPeriod(at(5), malam)).toBe(false);
  });
});

describe('komposisi & rasio belok', () => {
  it('komposisi per jenis', () => {
    const s = session();
    const rows = intervalRows(s, [iv(1, at(7), { 'A|-|SM': 30, 'A|-|MP': 10, 'B|-|MP': 10 })]);
    const types = s.classification.vehicleTypes;
    expect(composition(typeTotals(rows, types), types)).toMatchObject({ SM: 60, MP: 40, KS: 0 });
    expect(composition(typeTotals(rows, types, 'B|-'), types)).toMatchObject({ MP: 100 });
  });

  it('rasio belok simpang (basis skr) pada jam puncak', () => {
    const s = session({
      surveyType: 'SIMPANG',
      positions: [{ key: 'U', label: 'Utara', movements: ['LT', 'ST', 'RT'] }],
      countedKeys: ['U'],
    });
    const recs = [0, 1, 2, 3].map((i) =>
      iv(i + 1, at(7) + i * 15 * MIN, {
        'U|LT|MP': 25,
        'U|ST|MP': 75,
        'U|RT|MP': 25,
        'U|RT|SM': 100,
      }),
    );
    const r = recap(s, recs, [], [{ label: 'Pagi', start: '05:00', end: '10:00' }], 'skr');
    const peak = r.peaks[0].win!;
    expect(peak.total.skr).toBe(4 * (25 + 75 + 25 + 25)); // SM 100 × 0,25 = 25 skr
    expect(turnRatios(peak, r.flows)).toEqual({ LT: 100 / 600, RT: 200 / 600 });
  });

  it('basis skr turun ke kend bila ekr belum lengkap', () => {
    const s = session();
    s.classification.vehicleTypes[2].ekr = null;
    expect(recap(s, series(at(7), [1, 1, 1, 1]), [], [], 'skr').basis).toBe('kend');
  });
});
