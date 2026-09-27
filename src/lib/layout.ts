/**
 * Grid tombol seragam untuk n tombol di area dengan rasio lebar/tinggi `aspect`:
 * sel sedekat mungkin ke persegi, sel kosong sesedikit mungkin (seri → kolom lebih banyak).
 */
export function gridFor(n: number, aspect: number): { cols: number; rows: number } {
  if (n <= 1) return { cols: 1, rows: 1 };
  const ideal = Math.sqrt(n * aspect);
  const candidates = [Math.floor(ideal), Math.ceil(ideal)].map((c) => Math.min(n, Math.max(1, c)));
  const empty = (c: number) => Math.ceil(n / c) * c - n;
  const [cols] = candidates.sort(
    (a, b) => empty(a) - empty(b) || Math.abs(a - ideal) - Math.abs(b - ideal) || b - a,
  );
  return { cols, rows: Math.ceil(n / cols) };
}
