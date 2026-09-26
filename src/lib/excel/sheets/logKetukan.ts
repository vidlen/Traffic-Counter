import type { Worksheet } from 'exceljs';
import { t } from '../../../i18n/id';
import { toExcelSerial } from '../../time';
import { type Ctx, FMT, styleHeader, widths } from '../common';

// Sheet 7 (opsional): semua ketukan, undo, dan koreksi.
export function buildLogKetukan(ws: Worksheet, ctx: Ctx): void {
  const { s, r } = ctx;
  const head = ws.getRow(1);
  head.values = t.excel.log.head;
  styleHeader(head);
  const posLabel = Object.fromEntries(s.positions.map((p) => [p.key, p.label]));
  const events = [...ctx.input.events].sort((a, b) => a.t - b.t || (a.seq ?? 0) - (b.seq ?? 0));
  events.forEach((e, i) => {
    const x = ws.getRow(i + 2);
    x.values = [
      toExcelSerial(e.t),
      r.rows.find((row) => e.t >= row.start && e.t < row.end)?.index ?? null,
      posLabel[e.positionKey] ?? e.positionKey,
      e.movement ?? '-',
      e.vehicleCode,
      e.delta,
      e.kind,
    ];
    x.getCell(1).numFmt = FMT.stamp;
    x.getCell(6).numFmt = '+0;-0';
  });
  widths(ws, [21, 11, 18, 9, 11, 7, 12]);
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}
