import type { Worksheet } from 'exceljs';
import { t } from '../../../i18n/id';
import { fmtDay, fmtHm, localTime, toExcelSerial } from '../../time';
import { type Ctx, fillCell, FMT, STATUS_FILL, styleHeader, title, widths } from '../common';

// Sheet 1: info survei, catatan kejadian, periode tidak aktif, legenda, cara gabung.
export function buildInfo(ws: Worksheet, ctx: Ctx): void {
  const { s, r, input } = ctx;
  const T = t.excel.info;
  const K = T.keys;
  title(ws, `${t.app.name}: ${T.title}`);
  if (s.testMode) {
    const stamp = ws.getCell('D1');
    stamp.value = t.excel.testStamp;
    stamp.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    fillCell(stamp, 'FFB42318');
  }

  const counted = s.positions.filter((p) => s.countedKeys.includes(p.key));
  const movements =
    s.surveyType === 'SIMPANG' ? ` (${r.flows.map((f) => f.label).join(', ')})` : '';
  const sc = s.schedule;
  const schedule =
    s.timerMode === 'MANUAL'
      ? t.wizard.previewManual(s.manual?.maxIntervals)
      : sc.kind === 'BLOK'
        ? sc.blocks.map((b) => `${b.label} ${fmtHm(b.start)}-${fmtHm(b.end)}`).join(', ')
        : sc.count
          ? `${sc.count} × ${t.wizard.minutes(s.intervalMin)}`
          : `${t.wizard.until} ${fmtHm(sc.until ?? '')}`;
  const dateSerial = Math.floor(toExcelSerial(localTime(s.date, 0)));

  const rows: [string, string | number | null, string?][] = [
    [K.project, s.project],
    [K.location, s.location],
    [K.surveyType, s.surveyType === 'RUAS' ? t.wizard.ruas : t.wizard.simpang],
    [K.counted, counted.map((p) => p.label).join(', ') + movements],
    [K.positions, s.positions.map((p) => p.label).join(', ')],
    [K.date, dateSerial, FMT.date],
    [K.day, fmtDay(localTime(s.date, 0))],
    [K.surveyor, s.surveyor],
    [K.roadInfo, s.roadInfo ?? ''],
    [K.weather, s.weather ?? ''],
    [K.remarks, s.remarks ?? ''],
    [K.interval, s.intervalMin],
    [K.timerMode, t.wizard.modeText[s.timerMode === 'MANUAL' ? 'MANUAL' : sc.kind]],
    [K.schedule, schedule],
    [K.started, s.startedAt === undefined ? null : toExcelSerial(s.startedAt), FMT.stamp],
    [K.ended, s.endedAt === undefined ? null : toExcelSerial(s.endedAt), FMT.stamp],
    [K.classification, s.classification.name],
    [K.version, input.appVersion],
    [K.exportedAt, toExcelSerial(input.exportedAt), FMT.stamp],
    [K.dataKind, s.testMode ? t.excel.testStamp : T.fieldData],
  ];
  let y = 3;
  for (const [k, v, fmt] of rows) {
    ws.getCell(`A${y}`).value = k;
    ws.getCell(`A${y}`).font = { bold: true };
    const cell = ws.getCell(`B${y}`);
    cell.value = v;
    if (fmt) cell.numFmt = fmt;
    cell.alignment = { horizontal: 'left', wrapText: true };
    y++;
  }

  const section = (text: string) => {
    y++;
    ws.getCell(`A${y}`).value = text;
    ws.getCell(`A${y}`).font = { bold: true, size: 12 };
    y++;
  };

  section(T.notesTitle);
  const noteHead = ws.getRow(y);
  noteHead.values = T.notesHead;
  styleHeader(noteHead);
  y++;
  if (!input.notes.length) ws.getCell(`A${y++}`).value = T.none;
  for (const n of [...input.notes].sort((a, b) => a.t - b.t)) {
    const x = ws.getRow(y++);
    x.values = [
      toExcelSerial(n.t),
      r.rows.find((row) => n.t >= row.start && n.t < row.end)?.index ?? null,
      t.notes.categories[n.category],
      n.text ?? '',
    ];
    x.getCell(1).numFmt = FMT.stamp;
  }

  section(T.gapsTitle);
  const gapHead = ws.getRow(y);
  gapHead.values = T.gapsHead;
  styleHeader(gapHead);
  y++;
  if (!s.gaps.length) ws.getCell(`A${y++}`).value = T.none;
  for (const g of s.gaps) {
    const x = ws.getRow(y++);
    x.values = [
      toExcelSerial(g.from),
      toExcelSerial(g.to),
      Math.round((g.to - g.from) / 6000) / 10,
    ];
    x.getCell(1).numFmt = FMT.stamp;
    x.getCell(2).numFmt = FMT.stamp;
  }

  section(T.legendTitle);
  for (const st of ['LENGKAP', 'PARSIAL', 'TERPUTUS', 'TERLEWAT'] as const) {
    const a = ws.getCell(`A${y}`);
    a.value = st;
    a.font = { bold: true };
    const argb = STATUS_FILL[st];
    if (argb) fillCell(a, argb);
    ws.getCell(`B${y}`).value = T.legend[st];
    y++;
  }

  section(T.mergeTitle);
  for (const line of T.merge) ws.getCell(`A${y++}`).value = line;

  widths(ws, [26, 60, 18, 40]);
}
