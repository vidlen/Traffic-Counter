import { describe, expect, it } from 'vitest';
import type { VehicleType } from '../types';
import { TcDatabase } from './db';
import {
  ERR,
  fillEkrFromPkji,
  iconOf,
  MAX_VEHICLE_TYPES,
  PRESETS,
  textOn,
  validateTemplate,
  VEHICLE_COLORS,
} from './presets';

const codes = (id: string) => PRESETS.find((p) => p.id === id)!.vehicleTypes.map((v) => v.code);

describe('preset klasifikasi', () => {
  it('berisi 4 preset bawaan sesuai §6 A-D', () => {
    expect(PRESETS.map((p) => p.scheme)).toEqual(['PKJI2023', 'PKJI2023_KOTA', 'BM8', 'SEDERHANA']);
    expect(PRESETS.every((p) => p.builtIn)).toBe(true);
    expect(codes('preset-pkji2023')).toEqual(['SM', 'MP', 'KS', 'BB', 'TB', 'KTB']);
    expect(codes('preset-pkji2023-kota')).toEqual(['SM', 'MP', 'KS', 'KTB']);
    expect(codes('preset-bm8')).toEqual([
      'G1',
      'G2',
      'G3',
      'G4',
      'G5a',
      'G5b',
      'G6a',
      'G6b',
      'G7a',
      'G7b',
      'G7c',
      'G8',
    ]);
    expect(codes('preset-sederhana')).toHaveLength(5);
  });

  it('hanya mengisi ekr MP = 1,00 (PKJI); sisanya kosong', () => {
    for (const p of PRESETS) {
      for (const v of p.vehicleTypes) {
        const pkji = p.scheme === 'PKJI2023' || p.scheme === 'PKJI2023_KOTA';
        expect(v.ekr).toBe(pkji && v.code === 'MP' ? 1 : null);
      }
    }
  });

  it('kendaraan tidak bermotor tidak masuk skr', () => {
    const notInSkr = PRESETS.flatMap((p) =>
      p.vehicleTypes.filter((v) => !v.inSkr).map((v) => v.code),
    );
    expect(notInSkr).toEqual(['KTB', 'KTB', 'G8', 'LAIN']);
  });

  it('semua preset lolos validasi dan warnanya kontras (≥ 4,5:1)', () => {
    for (const p of PRESETS) expect(validateTemplate(p)).toEqual([]);
    const lum = (hex: string) => {
      const ch = [1, 3, 5].map((i) => {
        const v = parseInt(hex.slice(i, i + 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
    };
    for (const color of VEHICLE_COLORS) {
      const [a, b] = [lum(color), lum(textOn(color))].sort((x, y) => y - x);
      expect((a + 0.05) / (b + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('setiap jenis bawaan punya logo; tanpa pilihan, logo ikut padanan PKJI', () => {
    for (const p of PRESETS) for (const v of p.vehicleTypes) expect(iconOf(v)).toBeDefined();
    expect(iconOf({ pkji: 'BB' })).toBe('bus');
    expect(iconOf({ icon: 'traktor', pkji: 'BB' })).toBe('traktor');
    expect(iconOf({})).toBeUndefined();
  });

  it('di-seed ke Dexie saat DB dibuka', async () => {
    const d = new TcDatabase('test-seed');
    await d.open();
    const rows = await d.templates.toArray();
    expect(rows.map((r) => r.id).sort()).toEqual(PRESETS.map((p) => p.id).sort());
    await d.delete();
  });
});

describe('validateTemplate', () => {
  const v = (code: string, extra: Partial<VehicleType> = {}): VehicleType => ({
    code,
    name: 'Jenis ' + code,
    color: '#1d4ed8',
    ekr: null,
    inSkr: true,
    order: 0,
    ...extra,
  });
  const msgs = (name: string, types: VehicleType[]) =>
    validateTemplate({ name, vehicleTypes: types }).map((e) => e.message);

  it('menolak nama kosong, 0 jenis, dan lebih dari 14 jenis', () => {
    expect(msgs(' ', [v('A')])).toContain(ERR.name);
    expect(msgs('X', [])).toContain(ERR.count);
    const many = Array.from({ length: MAX_VEHICLE_TYPES + 1 }, (_, i) => v('K' + i));
    expect(msgs('X', many)).toContain(ERR.count);
    expect(msgs('X', many.slice(0, MAX_VEHICLE_TYPES))).toEqual([]);
  });

  it('menolak kode duplikat (tanpa beda huruf besar/kecil) dan kode tidak valid', () => {
    expect(msgs('X', [v('G5a'), v('B'), v('g5A')])).toEqual([ERR.dupCode, ERR.dupCode]);
    expect(msgs('X', [v('')])).toEqual([ERR.code]);
    expect(msgs('X', [v('ABCDEF')])).toEqual([ERR.code]);
    expect(msgs('X', [v('A B')])).toEqual([ERR.code]);
  });

  it('menolak ekr ≤ 0 atau bukan angka, menerima kosong', () => {
    expect(msgs('X', [v('A', { ekr: 0 })])).toEqual([ERR.ekr]);
    expect(msgs('X', [v('A', { ekr: NaN })])).toEqual([ERR.ekr]);
    expect(msgs('X', [v('A', { ekr: 0.25 })])).toEqual([]);
    expect(msgs('X', [v('A', { name: '' })])).toEqual([ERR.typeName]);
  });

  it('mengisi ekr dari padanan PKJI hanya untuk jenis yang masuk skr', () => {
    const bm8 = PRESETS.find((p) => p.id === 'preset-bm8')!.vehicleTypes;
    const filled = fillEkrFromPkji(bm8, { SM: 0.25, MP: 1, KS: 1.2, BB: 1.3, TB: 1.8, KTB: 9 });
    expect(Object.fromEntries(filled.map((x) => [x.code, x.ekr]))).toEqual({
      G1: 0.25,
      G2: 1,
      G3: 1,
      G4: 1,
      G5a: 1.2,
      G5b: 1.3,
      G6a: 1.2,
      G6b: 1.2,
      G7a: 1.8,
      G7b: 1.8,
      G7c: 1.8,
      G8: null,
    });
  });
});
