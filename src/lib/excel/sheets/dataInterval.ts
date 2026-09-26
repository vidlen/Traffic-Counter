import type { Worksheet } from 'exceljs';
import { t } from '../../../i18n/id';
import { fmtDate, localTime, toExcelSerial } from '../../time';
import {
  col,
  type Ctx,
  type DataIntervalLayout,
  fillCell,
  FMT,
  noteLabel,
  setFormula,
  STATUS_FILL,
  styleHeader,
  title,
  TOTAL_KEY,
  widths,
} from '../common';

const HEAD = 3;
const EKR = 4;
const FIRST = 5;
const TYPE_START = 6; // kolom F

// Sheet 3: format lebar, satu blok per aliran lalu blok Total (bila aliran > 1).
export function buildDataInterval(ws: Worksheet, ctx: Ctx): DataIntervalLayout {
  const { s, r, flows, types } = ctx;
  const T = t.excel.di;
  const test = s.testMode ? `, ${t.excel.testStamp}` : '';
  title(ws, T.title, `${s.location}, ${fmtDate(localTime(s.date, 0))}, ${s.surveyor}${test}`);

  const typeCol = Object.fromEntries(types.map((v, i) => [v.code, col(TYPE_START + i)]));
  const kendIdx = TYPE_START + types.length;
  const kendCol = col(kendIdx);
  const skrCol = col(kendIdx + 1);
  const statusIdx = kendIdx + 2;
  const noteIdx = kendIdx + 3;
  const first = typeCol[types[0].code];
  const last = typeCol[types[types.length - 1].code];
  const ekrRange = `$${first}$${EKR}:$${last}$${EKR}`;

  const head = ws.getRow(HEAD);
  head.values = [
    T.head.no,
    T.head.flow,
    T.head.date,
    T.head.start,
    T.head.end,
    ...types.map((v) => v.code),
    T.head.kend,
    T.head.skr,
    T.head.status,
    T.head.note,
  ];
  styleHeader(head);

  // Baris ekr tepat di bawah header: sumbernya sheet Klasifikasi.
  const ekrRow = ws.getRow(EKR);
  ekrRow.getCell(2).value = T.ekr;
  for (const v of types) {
    const kr = ctx.klasRow[v.code];
    const cell = ws.getCell(`${typeCol[v.code]}${EKR}`);
    setFormula(
      cell,
      `IF(Klasifikasi!E${kr}="Ya",IF(Klasifikasi!D${kr}="","",Klasifikasi!D${kr}),0)`,
      v.inSkr ? v.ekr : 0,
    );
    cell.numFmt = '0.00';
  }
  ekrRow.font = { italic: true, color: { argb: 'FF595959' } };
  for (let c = 1; c <= noteIdx; c++) fillCell(ekrRow.getCell(c), 'FFF2F2F2');

  const blocks = [
    ...flows.map((f) => ({ key: f.key, label: f.label })),
    ...(flows.length > 1
      ? [
          {
            key: TOTAL_KEY,
            label: s.surveyType === 'RUAS' ? T.totalRuas(flows.length) : T.totalSimpang,
          },
        ]
      : []),
  ];
  const rows = new Map<string, number>();
  blocks.forEach((b, bi) =>
    r.rows.forEach((row, i) => rows.set(`${b.key}#${row.index}`, FIRST + bi * r.rows.length + i)),
  );
  const rowOf = (key: string, index: number) => rows.get(`${key}#${index}`)!;

  for (const b of blocks) {
    r.rows.forEach((row, i) => {
      const rn = rowOf(b.key, row.index);
      const xr = ws.getRow(rn);
      const vol = b.key === TOTAL_KEY ? row.total : row.byFlow[b.key];
      xr.getCell(1).value = row.index;
      xr.getCell(2).value = b.label;
      xr.getCell(3).value = Math.floor(toExcelSerial(row.start));
      xr.getCell(3).numFmt = FMT.date;
      xr.getCell(4).value = toExcelSerial(row.start);
      xr.getCell(4).numFmt = FMT.time;
      xr.getCell(5).value = toExcelSerial(row.end);
      xr.getCell(5).numFmt = FMT.time;
      for (const v of types) {
        const cell = ws.getCell(`${typeCol[v.code]}${rn}`);
        if (b.key === TOTAL_KEY) {
          const refs = flows.map((f) => `${typeCol[v.code]}${rowOf(f.key, row.index)}`).join(',');
          setFormula(cell, `IF(COUNT(${refs})=0,"",SUM(${refs}))`, vol.byType[v.code]);
        } else cell.value = vol.byType[v.code]; // TERLEWAT → null = sel kosong
        cell.numFmt = FMT.int;
      }
      const rng = `${first}${rn}:${last}${rn}`;
      setFormula(ws.getCell(`${kendCol}${rn}`), `IF(COUNT(${rng})=0,"",SUM(${rng}))`, vol.kend);
      setFormula(
        ws.getCell(`${skrCol}${rn}`),
        `IF(OR(COUNT(${rng})=0,COUNTBLANK(${ekrRange})>0),"",SUMPRODUCT(${ekrRange},${rng}))`,
        vol.skr,
      );
      ws.getCell(`${kendCol}${rn}`).numFmt = FMT.int;
      ws.getCell(`${skrCol}${rn}`).numFmt = FMT.dec;
      xr.getCell(statusIdx).value = row.status;
      xr.getCell(noteIdx).value = row.notes.map((n) => noteLabel(n, t.notes.categories)).join('; ');
      const argb = STATUS_FILL[row.status];
      for (let c = 1; c <= noteIdx; c++) {
        const cell = xr.getCell(c);
        if (argb) fillCell(cell, argb);
        if (i === 0) cell.border = { top: { style: 'medium' } };
      }
      if (b.key === TOTAL_KEY) xr.font = { bold: true };
    });
  }

  widths(ws, [5, 18, 11, 7, 7, ...types.map(() => 7), 10, 10, 11, 32]);
  ws.views = [{ state: 'frozen', xSplit: 5, ySplit: EKR }];

  return {
    ekrRow: EKR,
    typeCol,
    kendCol,
    skrCol,
    totalKey: flows.length > 1 ? TOTAL_KEY : flows[0].key,
    rowOf,
  };
}
