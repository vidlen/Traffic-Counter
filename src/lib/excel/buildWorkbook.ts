import ExcelJS from 'exceljs';
import { recap } from '../aggregate';
import { type Ctx, type ExportInput, printSetup } from './common';
import { buildDataGabung } from './sheets/dataGabung';
import { buildDataInterval } from './sheets/dataInterval';
import { buildGrafik } from './sheets/grafik';
import { buildInfo } from './sheets/info';
import { buildKlasifikasi } from './sheets/klasifikasi';
import { buildLogKetukan } from './sheets/logKetukan';
import { buildRekapJam } from './sheets/rekapJam';

export type { ExportInput } from './common';
export { fileName } from './fileName';

export const SHEETS = [
  'Info_Survei',
  'Klasifikasi',
  'Data_Interval',
  'Rekap_Jam',
  'Grafik',
  'Data_Gabung',
  'Log_Ketukan',
] as const;

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Workbook export (BRIEF §11). Murni terhadap input: tanpa DOM, tanpa Dexie.
 * Urutan sheet tetap; sheet diisi sesuai ketergantungan rujukan antar-sheet.
 */
export function buildWorkbook(input: ExportInput): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TC Counter';
  wb.calcProperties.fullCalcOnLoad = true;
  const s = input.session;
  const r = recap(s, input.intervals, input.notes, input.periods, input.basis);
  const ctx: Ctx = {
    input,
    wb,
    s,
    r,
    flows: r.flows,
    types: r.types,
    n: 60 / s.intervalMin,
    klasRow: {},
    winRow: new Map(),
  };
  const names = SHEETS.filter((n) => n !== 'Log_Ketukan' || input.includeLog);
  const ws = Object.fromEntries(names.map((n) => [n, wb.addWorksheet(n)]));

  buildKlasifikasi(ws.Klasifikasi, ctx);
  ctx.di = buildDataInterval(ws.Data_Interval, ctx);
  buildRekapJam(ws.Rekap_Jam, ctx);
  buildGrafik(ws.Grafik, ctx);
  buildDataGabung(ws.Data_Gabung, ctx);
  if (input.includeLog) buildLogKetukan(ws.Log_Ketukan, ctx);
  buildInfo(ws.Info_Survei, ctx);
  for (const sheet of wb.worksheets) printSetup(sheet);
  return wb;
}

export async function exportXlsx(input: ExportInput): Promise<Blob> {
  const buffer = await buildWorkbook(input).xlsx.writeBuffer();
  return new Blob([buffer], { type: XLSX_MIME });
}
