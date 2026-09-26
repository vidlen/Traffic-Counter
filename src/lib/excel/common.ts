import type { Cell, CellFormulaValue, Row, Workbook, Worksheet } from 'exceljs';
import type {
  CountEvent,
  IntervalRecord,
  IntervalStatus,
  NoteEvent,
  PeakPeriod,
  Session,
  VehicleType,
} from '../../types';
import type { Basis, recap, WindowRow } from '../aggregate';
import type { Flow } from '../session';

export interface ExportInput {
  session: Session;
  intervals: IntervalRecord[];
  notes: NoteEvent[];
  events: CountEvent[];
  periods: PeakPeriod[];
  basis: Basis; // basis pemilihan jam puncak
  includeLog: boolean;
  appVersion: string;
  exportedAt: number;
  charts?: { line: string; bar: string }; // PNG base64 (tanpa prefix data:)
}

/** Posisi sel di Data_Interval yang dirujuk sheet lain. */
export interface DataIntervalLayout {
  ekrRow: number;
  typeCol: Record<string, string>;
  kendCol: string;
  skrCol: string;
  totalKey: string; // blok yang dipakai sebagai Total (blok Total, atau satu-satunya aliran)
  rowOf: (blockKey: string, intervalIndex: number) => number;
}

export interface Ctx {
  input: ExportInput;
  wb: Workbook;
  s: Session;
  r: ReturnType<typeof recap>;
  flows: Flow[];
  types: VehicleType[];
  n: number; // interval per jam
  klasRow: Record<string, number>; // baris tiap jenis di sheet Klasifikasi
  di?: DataIntervalLayout;
  winRow: Map<WindowRow, number>; // baris jam bulat/bergerak di Rekap_Jam
}

export const TOTAL_KEY = 'TOTAL';

// Warna status interval (§8.5).
export const STATUS_FILL: Partial<Record<IntervalStatus, string>> = {
  PARSIAL: 'FFFFF2CC',
  TERPUTUS: 'FFFCE4D6',
  TERLEWAT: 'FFD9D9D9',
};
const HEAD_FILL = 'FFE7E6E6';

export const FMT = {
  date: 'dd/mm/yyyy',
  time: 'hh:mm',
  dateTime: 'dd/mm/yyyy hh:mm',
  stamp: 'dd/mm/yyyy hh:mm:ss',
  int: '#,##0',
  dec: '#,##0.00',
  pct: '0.0%',
  phf: '0.000',
};

/** Nomor kolom → huruf (1 → A, 27 → AA). */
export function col(n: number): string {
  let s = '';
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26))
    s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
}

/** Sel rumus selalu diberi `result` (angka tampil di viewer yang tidak menghitung ulang). */
export function setFormula(cell: Cell, formula: string, result: number | string | null): void {
  cell.value = { formula, result: result ?? '' } as CellFormulaValue;
}

export function fillCell(cell: Cell, argb: string): void {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

export function styleHeader(row: Row): void {
  row.font = { bold: true };
  row.alignment = { vertical: 'middle', wrapText: true };
  row.eachCell((c) => {
    fillCell(c, HEAD_FILL);
    c.border = { bottom: { style: 'thin' } };
  });
}

export function title(ws: Worksheet, text: string, sub?: string): void {
  ws.getCell('A1').value = text;
  ws.getCell('A1').font = { bold: true, size: 14 };
  if (sub) ws.getCell('A2').value = sub;
}

export function widths(ws: Worksheet, list: number[]): void {
  list.forEach((w, i) => (ws.getColumn(i + 1).width = w));
}

/** Setup cetak landscape A4, muat selebar halaman. */
export function printSetup(ws: Worksheet): void {
  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
  };
}

export const noteLabel = (n: NoteEvent, categories: Record<string, string>) =>
  n.category === 'LAINNYA' && n.text
    ? n.text
    : `${categories[n.category]}${n.text ? `: ${n.text}` : ''}`;

/** Rentang satu kolom di sheet lain: Data_Interval!L5:L8 */
export const range = (sheet: string, c: string, a: number, b: number) =>
  `${sheet}!${c}${a}:${c}${b}`;
