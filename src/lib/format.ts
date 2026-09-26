// Format angka gaya Indonesia: koma desimal (1,25), titik ribuan (1.200).
const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

export function fmtNum(n: number | null | undefined, digits?: number): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  return digits === undefined
    ? nf.format(n)
    : n.toLocaleString('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** '1,25' / '1.25' → 1.25 · '' → null · teks lain → NaN (ditolak validasi). */
export function parseDecimal(s: string): number | null {
  const v = s.trim().replace(',', '.');
  if (v === '') return null;
  return /^\d+(\.\d+)?$/.test(v) ? Number(v) : NaN;
}

/** ekr untuk ditampilkan di input: 1 → '1,00', null → ''. */
export function fmtEkr(ekr: number | null): string {
  return ekr === null ? '' : fmtNum(ekr, 2);
}
