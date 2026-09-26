import type { Worksheet } from 'exceljs';
import { t } from '../../../i18n/id';
import { toExcelSerial } from '../../time';
import { type Ctx, FMT, setFormula, styleHeader, widths } from '../common';

// Sheet 6: format panjang dengan kolom tetap (tidak bergantung klasifikasi), untuk digabung
// manual antar-HP. skr = rumus relatif di baris yang sama → tetap benar setelah copy-paste.
export function buildDataGabung(ws: Worksheet, ctx: Ctx): void {
  const { s, r, flows, types } = ctx;
  const head = ws.getRow(1);
  head.values = t.excel.gabung.head;
  styleHeader(head);
  const surveyType = s.surveyType === 'RUAS' ? t.wizard.ruas : t.wizard.simpang;
  const posLabel = Object.fromEntries(s.positions.map((p) => [p.key, p.label]));

  let y = 2;
  for (const row of r.rows) {
    const date = Math.floor(toExcelSerial(row.start));
    for (const f of flows) {
      for (const v of types) {
        const qty = row.byFlow[f.key].byType[v.code]; // TERLEWAT → null (kosong)
        const ekr = v.inSkr ? v.ekr : 0; // tidak masuk skr → 0; belum diisi → kosong
        const x = ws.getRow(y);
        x.values = [
          s.project,
          s.location,
          date,
          s.surveyor,
          surveyType,
          posLabel[f.positionKey],
          f.movement ?? '-',
          row.blockLabel ?? '',
          row.index,
          toExcelSerial(row.start),
          toExcelSerial(row.end),
          (row.end - row.start) / 60_000,
          v.code,
          v.name,
          v.pkji ?? '',
          qty,
          ekr,
        ];
        setFormula(
          x.getCell(18),
          `IF(OR(P${y}="",Q${y}=""),"",P${y}*Q${y})`,
          qty === null || ekr === null ? null : qty * ekr,
        );
        x.getCell(19).value = row.status;
        x.getCell(3).numFmt = FMT.date;
        x.getCell(10).numFmt = FMT.time;
        x.getCell(11).numFmt = FMT.time;
        x.getCell(17).numFmt = '0.00';
        x.getCell(18).numFmt = FMT.dec;
        y++;
      }
    }
  }
  widths(ws, [22, 20, 11, 16, 11, 16, 8, 8, 11, 7, 7, 12, 11, 22, 12, 8, 6, 8, 11]);
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: `S${Math.max(1, y - 1)}` };
}
