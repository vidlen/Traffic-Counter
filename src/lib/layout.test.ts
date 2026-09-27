import { describe, expect, it } from 'vitest';
import { gridFor } from './layout';

describe('gridFor (tombol sama besar)', () => {
  it('panel satu arah di landscape 2 arah (rasio ±1,25)', () => {
    expect(gridFor(4, 1.25)).toEqual({ cols: 2, rows: 2 }); // PKJI Perkotaan
    expect(gridFor(5, 1.25)).toEqual({ cols: 3, rows: 2 }); // Sederhana
    expect(gridFor(6, 1.25)).toEqual({ cols: 3, rows: 2 }); // PKJI 2023
    expect(gridFor(12, 1.25)).toEqual({ cols: 4, rows: 3 }); // Bina Marga
    expect(gridFor(14, 1.25)).toEqual({ cols: 5, rows: 3 }); // maksimum jenis
  });

  it('panel selebar layar (ruas 1 arah, rasio ±2,6)', () => {
    expect(gridFor(4, 2.6)).toEqual({ cols: 4, rows: 1 });
    expect(gridFor(6, 2.6)).toEqual({ cols: 3, rows: 2 });
    expect(gridFor(12, 2.6)).toEqual({ cols: 6, rows: 2 });
    expect(gridFor(1, 2.6)).toEqual({ cols: 1, rows: 1 });
  });
});
