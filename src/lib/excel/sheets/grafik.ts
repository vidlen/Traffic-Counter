import type { Worksheet } from 'exceljs';
import { t } from '../../../i18n/id';
import { type Ctx, title } from '../common';

// Sheet 5: dua gambar PNG (Chart.js di kanvas tersembunyi, 1600 × 800) + keterangan.
export function buildGrafik(ws: Worksheet, ctx: Ctx): void {
  const T = t.excel.chart;
  title(ws, T.title);
  const charts = ctx.input.charts;
  let captionRow = 3;
  if (charts) {
    const size = { width: 960, height: 480 };
    const line = ctx.wb.addImage({ base64: charts.line, extension: 'png' });
    const bar = ctx.wb.addImage({ base64: charts.bar, extension: 'png' });
    ws.addImage(line, { tl: { col: 0, row: 2 }, ext: size });
    ws.addImage(bar, { tl: { col: 0, row: 28 }, ext: size });
    captionRow = 54;
  }
  const cap = ws.getCell(`A${captionRow}`);
  cap.value = T.caption;
  cap.font = { italic: true, color: { argb: 'FF595959' } };
}
