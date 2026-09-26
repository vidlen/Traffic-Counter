import type { Worksheet } from 'exceljs';
import { t } from '../../../i18n/id';
import { composition, turnRatios, typeTotals, type WindowRow } from '../../aggregate';
import { fmtDate, localTime } from '../../time';
import {
  col,
  type Ctx,
  FMT,
  range,
  setFormula,
  styleHeader,
  title,
  TOTAL_KEY,
  widths,
} from '../common';

const DI = 'Data_Interval';

// Sheet 4: rekap jam. Semua angka = rumus live yang merujuk Data_Interval;
// hanya pemilihan baris jam puncak yang statis (ditentukan app saat export).
export function buildRekapJam(ws: Worksheet, ctx: Ctx): void {
  const { s, r, flows, types, n } = ctx;
  const di = ctx.di!;
  const T = t.excel.rj;
  const basis = r.basis;
  const yes = t.excel.klas.yes;
  const no = t.excel.klas.no;
  const test = s.testMode ? `, ${t.excel.testStamp}` : '';
  title(ws, T.title, `${s.location}, ${fmtDate(localTime(s.date, 0))}, ${s.surveyor}${test}`);

  const vols = [
    ...flows.map((f) => ({ key: f.key, label: f.label })),
    ...(flows.length > 1 ? [{ key: TOTAL_KEY, label: T.total }] : []),
  ];
  const totKend = col(2 + (vols.length - 1) * 2);
  const totSkr = col(3 + (vols.length - 1) * 2);
  const vMaxCol = col(2 + vols.length * 2);
  const rowsOf = (key: string, w: WindowRow) =>
    [di.rowOf(key, w.rows[0].index), di.rowOf(key, w.rows[w.rows.length - 1].index)] as const;
  const sumOf = (c: string, a: number, b: number) => {
    const rg = range(DI, c, a, b);
    return `IF(COUNT(${rg})=0,"",SUM(${rg}))`;
  };
  let y = 4;
  const heading = (text: string) => {
    ws.getCell(`A${y}`).value = text;
    ws.getCell(`A${y}`).font = { bold: true, size: 12 };
    y++;
  };
  const header = (values: string[]) => {
    const row = ws.getRow(y);
    row.values = values;
    styleHeader(row);
    y++;
  };

  const windowTable = (text: string, first: string, list: WindowRow[], withMax: boolean) => {
    heading(text);
    header([
      first,
      ...vols.flatMap((v) => [`${v.label} kend`, `${v.label} skr`]),
      ...(withMax ? [T.vMax(basis)] : []),
      T.valid,
    ]);
    for (const w of list) {
      const row = ws.getRow(y);
      row.getCell(1).value = w.label;
      vols.forEach((v, i) => {
        const [a, b] = rowsOf(v.key, w);
        const vol = v.key === TOTAL_KEY ? w.total : w.byFlow[v.key];
        setFormula(row.getCell(2 + i * 2), sumOf(di.kendCol, a, b), vol.kend);
        setFormula(row.getCell(3 + i * 2), sumOf(di.skrCol, a, b), vol.skr);
        row.getCell(2 + i * 2).numFmt = FMT.int;
        row.getCell(3 + i * 2).numFmt = FMT.dec;
      });
      let c = 2 + vols.length * 2;
      if (withMax) {
        const [a, b] = rowsOf(di.totalKey, w);
        const rg = range(DI, basis === 'skr' ? di.skrCol : di.kendCol, a, b);
        setFormula(row.getCell(c), `IF(COUNT(${rg})=0,"",MAX(${rg}))`, w.vMax[basis]);
        row.getCell(c).numFmt = basis === 'skr' ? FMT.dec : FMT.int;
        c++;
      }
      row.getCell(c).value = w.valid ? yes : no;
      ctx.winRow.set(w, y);
      y++;
    }
    y++;
  };

  // A. Jam bulat, B. Jam bergerak (n > 1).
  windowTable(T.hourly, T.hour, r.hours, false);
  if (n > 1) windowTable(T.moving, T.range, r.moves, true);

  // C. Jam puncak per periode + keseluruhan.
  heading(T.peak(basis));
  header([
    T.period,
    T.range,
    T.volKend,
    T.volSkr,
    T.vMax(basis),
    T.phf(s.intervalMin),
    ...types.map((v) => `${v.code} %`),
    T.note,
  ]);
  const volCol = basis === 'skr' ? 'D' : 'C';
  for (const p of r.peaks) {
    const row = ws.getRow(y);
    row.getCell(1).value = p.label;
    row.getCell(2).value = p.win?.label ?? '';
    const w = p.win;
    if (w) {
      const wr = ctx.winRow.get(w)!;
      setFormula(row.getCell(3), `${totKend}${wr}`, w.total.kend);
      setFormula(row.getCell(4), `${totSkr}${wr}`, w.total.skr);
      row.getCell(3).numFmt = FMT.int;
      row.getCell(4).numFmt = FMT.dec;
      if (n > 1) {
        setFormula(row.getCell(5), `${vMaxCol}${wr}`, w.vMax[basis]);
        setFormula(
          row.getCell(6),
          `IF(OR(${volCol}${y}="",E${y}="",E${y}=0),"",${volCol}${y}/(${n}*E${y}))`,
          p.phf,
        );
        row.getCell(5).numFmt = basis === 'skr' ? FMT.dec : FMT.int;
        row.getCell(6).numFmt = FMT.phf;
      }
      const [a, b] = rowsOf(di.totalKey, w);
      const comp = composition(typeTotals(w.rows, types), types);
      types.forEach((v, i) => {
        const cell = row.getCell(7 + i);
        const share = comp[v.code];
        setFormula(
          cell,
          `IF(OR(C${y}="",C${y}=0),"",SUM(${range(DI, di.typeCol[v.code], a, b)})/C${y})`,
          share === null ? null : share / 100,
        );
        cell.numFmt = FMT.pct;
      });
    }
    row.getCell(7 + types.length).value = w
      ? p.incomplete
        ? t.recap.incomplete
        : ''
      : t.recap.noPeak;
    y++;
  }
  y++;

  // D. Komposisi seluruh survei per aliran dan total.
  heading(T.composition);
  header([T.flow, ...types.map((v) => `${v.code} %`)]);
  for (const v of vols) {
    const row = ws.getRow(y);
    const a = di.rowOf(v.key, r.rows[0].index);
    const b = di.rowOf(v.key, r.rows[r.rows.length - 1].index);
    const kend = range(DI, di.kendCol, a, b);
    const comp = composition(
      v.key === TOTAL_KEY ? typeTotals(r.rows, types) : typeTotals(r.rows, types, v.key),
      types,
    );
    row.getCell(1).value = v.label;
    types.forEach((vt, i) => {
      const cell = row.getCell(2 + i);
      const share = comp[vt.code];
      setFormula(
        cell,
        `IF(SUM(${kend})=0,"",SUM(${range(DI, di.typeCol[vt.code], a, b)})/SUM(${kend}))`,
        share === null ? null : share / 100,
      );
      cell.numFmt = FMT.pct;
    });
    y++;
  }
  y++;

  // E. Rasio belok simpang pada jam puncak keseluruhan (basis skr).
  const overall = r.peaks[r.peaks.length - 1]?.win;
  if (s.surveyType === 'SIMPANG') {
    heading(T.turn);
    header([T.range, 'pLT', 'pRT']);
    const row = ws.getRow(y);
    row.getCell(1).value = overall?.label ?? '';
    if (overall) {
      const ratios = turnRatios(overall, flows);
      const [a, b] = rowsOf(di.totalKey, overall);
      const tot = range(DI, di.skrCol, a, b);
      (['LT', 'RT'] as const).forEach((m, i) => {
        const f = flows.find((x) => x.movement === m);
        const cell = row.getCell(2 + i);
        if (!f) return;
        const [fa, fb] = rowsOf(f.key, overall);
        setFormula(
          cell,
          `IF(SUM(${tot})=0,"",SUM(${range(DI, di.skrCol, fa, fb)})/SUM(${tot}))`,
          ratios[m],
        );
        cell.numFmt = FMT.phf;
      });
    }
  }

  widths(ws, [
    22,
    ...Array.from({ length: Math.max(vols.length * 2 + 2, types.length + 7) }, () => 11),
  ]);
}
