import type { Worksheet } from 'exceljs';
import { t } from '../../../i18n/id';
import { type Ctx, styleHeader, widths } from '../common';

// Sheet 2: sumber ekr bagi semua rumus skr (mengubah ekr di sini memperbarui seluruh skr).
export function buildKlasifikasi(ws: Worksheet, ctx: Ctx): void {
  const tk = t.excel.klas;
  const head = ws.getRow(1);
  head.values = tk.head;
  styleHeader(head);
  ctx.types.forEach((v, i) => {
    const r = i + 2;
    ctx.klasRow[v.code] = r;
    ws.getRow(r).values = [
      v.code,
      v.name,
      v.description ?? '',
      v.ekr ?? null, // ekr kosong dibiarkan kosong
      v.inSkr ? tk.yes : tk.no,
      v.pkji ?? '',
    ];
    ws.getCell(`D${r}`).numFmt = '0.00';
  });
  const hint = ws.getCell(`A${ctx.types.length + 3}`);
  hint.value = tk.hint;
  hint.font = { italic: true, color: { argb: 'FF595959' } };
  widths(ws, [8, 26, 44, 8, 11, 13]);
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}
