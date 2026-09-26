import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { demoData } from '../../test/fixtures';
import { recap } from '../aggregate';
import { buildWorkbook, fileName, SHEETS } from './buildWorkbook';
import type { ExportInput } from './common';
import { sanitize } from './fileName';

const PERIODS = [
  { label: 'Pagi', start: '05:00', end: '10:00' },
  { label: 'Siang', start: '10:00', end: '15:00' },
  { label: 'Sore', start: '15:00', end: '19:00' },
  { label: 'Malam', start: '19:00', end: '05:00' },
];

function input(opts: Parameters<typeof demoData>[0] = {}, over: Partial<ExportInput> = {}) {
  const d = demoData(opts);
  return {
    session: d.session,
    intervals: d.intervals,
    notes: d.notes,
    events: d.events,
    periods: PERIODS,
    basis: 'skr' as const,
    includeLog: true,
    appVersion: '1.0.0',
    exportedAt: new Date(2026, 0, 5, 17, 30).getTime(),
    ...over,
  };
}

/** Tulis ke buffer lalu baca ulang (seperti membuka file hasil export). */
async function roundTrip(i: ExportInput) {
  const buf = await buildWorkbook(i).xlsx.writeBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  return wb;
}

const frac = (x: number) => x - Math.floor(x);
/** ExcelJS mengubah angka berformat tanggal/jam menjadi Date (UTC) saat membaca; kembalikan ke serial. */
const serial = (v: unknown) =>
  v instanceof Date ? v.getTime() / 86_400_000 + 25569 : (v as number);
/** Workbook di memori = persis yang ditulis ke file (pembaca ExcelJS membuang result ""). */
const sheet = (i: ExportInput, name: string) => buildWorkbook(i).getWorksheet(name)!;

describe('buildWorkbook', () => {
  it('nama & urutan sheet sesuai §11.2 (Log_Ketukan opsional)', async () => {
    expect((await roundTrip(input())).worksheets.map((w) => w.name)).toEqual([...SHEETS]);
    const noLog = await roundTrip(input({}, { includeLog: false }));
    expect(noLog.worksheets.map((w) => w.name)).toEqual(SHEETS.filter((n) => n !== 'Log_Ketukan'));
  });

  it('Data_Interval: header, baris ekr, rumus total + result, serial waktu lokal', async () => {
    const i = input();
    const r = recap(i.session, i.intervals, i.notes, PERIODS, 'skr');
    const ws = (await roundTrip(i)).getWorksheet('Data_Interval')!;
    expect(ws.getRow(3).values).toEqual([
      undefined,
      'No',
      'Aliran',
      'Tanggal',
      'Mulai',
      'Selesai',
      'SM',
      'MP',
      'KS',
      'BB',
      'TB',
      'KTB',
      'Total kend',
      'Total skr',
      'Status',
      'Catatan',
    ]);
    expect(ws.getCell('F4').formula).toBe(
      'IF(Klasifikasi!E2="Ya",IF(Klasifikasi!D2="","",Klasifikasi!D2),0)',
    );
    expect(ws.getCell('F4').result).toBe(0.25);
    expect(ws.getCell('K4').result).toBe(0); // KTB tidak masuk skr

    // Baris pertama arah A: interval 06.00-06.15 (PARSIAL).
    expect(serial(ws.getCell('C5').value)).toBe(46027);
    expect(ws.getCell('C5').numFmt).toBe('dd/mm/yyyy');
    expect(frac(serial(ws.getCell('D5').value))).toBeCloseTo(0.25, 9); // 06.00 lokal
    expect(ws.getCell('D5').numFmt).toBe('hh:mm');
    expect(ws.getCell('L5').formula).toBe('IF(COUNT(F5:K5)=0,"",SUM(F5:K5))');
    expect(ws.getCell('L5').result).toBe(r.rows[0].byFlow['A|-'].kend);
    expect(ws.getCell('M5').formula).toBe(
      'IF(OR(COUNT(F5:K5)=0,COUNTBLANK($F$4:$K$4)>0),"",SUMPRODUCT($F$4:$K$4,F5:K5))',
    );
    expect(ws.getCell('M5').result).toBeCloseTo(r.rows[0].byFlow['A|-'].skr!, 6);
    expect(ws.getCell('N5').value).toBe('PARSIAL');

    // Blok Total (baris 45 = 5 + 2 × 20): SUM dari baris yang bersesuaian di tiap arah.
    expect(ws.getCell('B45').value).toBe('Total 2 arah');
    expect(ws.getCell('F45').formula).toBe('IF(COUNT(F5,F25)=0,"",SUM(F5,F25))');
    expect(ws.getCell('F45').result).toBe(r.rows[0].total.byType.SM);
  });

  it('baris TERLEWAT: sel jenis kosong, Total kend & Total skr kosong (bukan 0)', async () => {
    const mem = sheet(input(), 'Data_Interval');
    const file = (await roundTrip(input())).getWorksheet('Data_Interval')!;
    // interval 10 (08.15-08.30) di arah A (14), arah B (34), dan Total (54)
    for (const row of [14, 34, 54]) {
      expect(file.getCell(`N${row}`).value).toBe('TERLEWAT');
      expect(file.getCell(`L${row}`).formula).toBe(
        `IF(COUNT(F${row}:K${row})=0,"",SUM(F${row}:K${row}))`,
      );
      expect(file.getCell(`L${row}`).result).not.toBe(0);
      expect(mem.getCell(`L${row}`).result).toBe('');
      expect(mem.getCell(`M${row}`).result).toBe('');
    }
    expect(file.getCell('F14').value).toBeNull();
    expect(file.getCell('F34').value).toBeNull();
    expect(mem.getCell('F54').result).toBe('');
  });

  it('Rekap_Jam: jam puncak dengan rumus PHF live dan result benar', async () => {
    const i = input();
    const r = recap(i.session, i.intervals, i.notes, PERIODS, 'skr');
    const ws = (await roundTrip(i)).getWorksheet('Rekap_Jam')!;
    let overall = 0;
    ws.eachRow((row, n) => {
      if (row.getCell(1).value === 'Keseluruhan') overall = n;
    });
    expect(overall).toBeGreaterThan(0);
    const phf = ws.getCell(`F${overall}`);
    expect(phf.formula).toBe(
      `IF(OR(D${overall}="",E${overall}="",E${overall}=0),"",D${overall}/(4*E${overall}))`,
    );
    expect(phf.result).toBeCloseTo(r.peaks.at(-1)!.phf!, 9);
    expect(ws.getCell(`B${overall}`).value).toBe(r.peaks.at(-1)!.win!.label);
    // Volume jam puncak merujuk baris jam bergerak (rumus), bukan angka mati.
    expect(ws.getCell(`C${overall}`).formula).toMatch(/^[A-Z]+\d+$/);
  });

  it('Data_Gabung: kolom tetap, rumus skr relatif baris, TERLEWAT kosong', async () => {
    const i = input();
    const ws = (await roundTrip(i)).getWorksheet('Data_Gabung')!;
    expect((ws.getRow(1).values as unknown[]).slice(1)).toEqual([
      'Proyek',
      'Lokasi',
      'Tanggal',
      'Surveyor',
      'Tipe_Survei',
      'Posisi',
      'Gerakan',
      'Blok',
      'Interval_Ke',
      'Mulai',
      'Selesai',
      'Durasi_Menit',
      'Kode_Jenis',
      'Nama_Jenis',
      'Padanan_PKJI',
      'Jumlah',
      'ekr',
      'skr',
      'Status',
    ]);
    expect(ws.rowCount).toBe(1 + 20 * 2 * 6);
    expect(ws.getCell('R2').formula).toBe('IF(OR(P2="",Q2=""),"",P2*Q2)');
    expect(ws.getCell('R77').formula).toBe('IF(OR(P77="",Q77=""),"",P77*Q77)');
    expect(ws.getCell('R2').result).toBeCloseTo((ws.getCell('P2').value as number) * 0.25, 9);
    expect(ws.getCell('Q7').value).toBe(0); // KTB tidak masuk skr → ekr 0
    expect(ws.getCell('F2').value).toBe('Arah Tugu');
    expect(ws.getCell('G2').value).toBe('-');
    expect(ws.getCell('H2').value).toBe('Pagi');
    // Interval 10 TERLEWAT: baris (10-1) × 12 + 2 = 110 s/d 121.
    const mem = sheet(i, 'Data_Gabung');
    for (let row = 110; row <= 121; row++) {
      expect(ws.getCell(`S${row}`).value).toBe('TERLEWAT');
      expect(ws.getCell(`P${row}`).value).toBeNull();
      expect(mem.getCell(`R${row}`).result).toBe('');
    }
  });

  it('Klasifikasi & Log_Ketukan', async () => {
    const i = input();
    const wb = await roundTrip(i);
    const k = wb.getWorksheet('Klasifikasi')!;
    expect(k.getCell('E2').value).toBe('Ya');
    expect(k.getCell('E7').value).toBe('Tidak');
    expect(k.getCell('D2').value).toBe(0.25);
    expect(k.getCell('D7').value).toBeNull(); // ekr kosong dibiarkan kosong
    const log = wb.getWorksheet('Log_Ketukan')!;
    expect(log.rowCount).toBe(1 + i.events.length);
    expect(log.getCell('A2').numFmt).toBe('dd/mm/yyyy hh:mm:ss');
    const kinds = new Set<string>();
    log.eachRow((row, n) => n > 1 && kinds.add(row.getCell(7).value as string));
    expect([...kinds].sort()).toEqual(['KOREKSI', 'TAP', 'UNDO']);
  });

  it('hanya memakai fungsi Excel 2016 / WPS / Google Sheets', async () => {
    const allowed = new Set([
      'SUM',
      'SUMPRODUCT',
      'IF',
      'AND',
      'OR',
      'COUNT',
      'COUNTBLANK',
      'MAX',
      'INDEX',
      'MATCH',
      'ROUND',
    ]);
    for (const opts of [{}, { simpang: true }]) {
      const wb = buildWorkbook(input(opts));
      const used = new Set<string>();
      let formulas = 0;
      wb.eachSheet((ws) =>
        ws.eachRow((row) =>
          row.eachCell((cell) => {
            if (!cell.formula) return;
            formulas++;
            expect(cell.result, `${ws.name}!${cell.address}`).not.toBeUndefined();
            for (const m of cell.formula.matchAll(/([A-Z][A-Z0-9.]*)\(/g)) used.add(m[1]);
          }),
        ),
      );
      expect(formulas).toBeGreaterThan(100);
      expect([...used].filter((f) => !allowed.has(f))).toEqual([]);
    }
  });

  it('simpang: blok per gerakan + Total lengan, rasio belok pLT/pRT', async () => {
    const i = input({ simpang: true });
    const r = recap(i.session, i.intervals, i.notes, PERIODS, 'skr');
    const wb = await roundTrip(i);
    const di = wb.getWorksheet('Data_Interval')!;
    expect([
      di.getCell('B5').value,
      di.getCell('B25').value,
      di.getCell('B45').value,
      di.getCell('B65').value,
    ]).toEqual(['LT', 'ST', 'RT', 'Total lengan']);
    const rj = wb.getWorksheet('Rekap_Jam')!;
    let row = 0;
    rj.eachRow((x, n) => {
      if (x.getCell(2).value === 'pLT') row = n + 1;
    });
    expect(row).toBeGreaterThan(0);
    const ratios = (await import('../aggregate')).turnRatios(r.peaks.at(-1)!.win!, r.flows);
    expect(rj.getCell(`B${row}`).result).toBeCloseTo(ratios.LT!, 9);
    expect(rj.getCell(`C${row}`).result).toBeCloseTo(ratios.RT!, 9);
  });

  it('ekr belum lengkap → skr kosong, jam puncak berbasis kend; cap DATA UJI', async () => {
    const i = input({ ekrComplete: false });
    i.session.testMode = true;
    const wb = await roundTrip(i);
    expect(sheet(i, 'Data_Interval').getCell('M6').result).toBe('');
    expect(wb.getWorksheet('Data_Interval')!.getCell('M6').formula).toContain('COUNTBLANK');
    expect(wb.getWorksheet('Info_Survei')!.getCell('D1').value).toBe('DATA UJI');
    let found = false;
    wb.getWorksheet('Rekap_Jam')!.eachRow((x) => {
      if (String(x.getCell(1).value).includes('basis kend')) found = true;
    });
    expect(found).toBe(true);
  });
});

describe('nama file', () => {
  it('disanitasi: huruf, angka, _, -', () => {
    expect(sanitize('Jl. Kaliurang km 5')).toBe('Jl_Kaliurang_km_5');
    expect(sanitize('  Café Ñandú / Simpang #3 ')).toBe('Cafe_Nandu_Simpang_3');
    expect(
      fileName({
        location: 'Jl. Kaliurang km 5',
        countedKeys: ['A', 'B'],
        date: '2026-01-05',
        surveyor: 'Rara W.',
      }),
    ).toBe('TC_Jl_Kaliurang_km_5_A-B_20260105_Rara_W.xlsx');
  });
});
