import { t } from '../i18n/id';
import type { ClassificationTemplate, PkjiClass, VehicleIcon, VehicleType } from '../types';

// Warna tombol: gelap-jenuh (teks putih, kontras ≥ 4,5:1) supaya terbaca di bawah matahari.
// Urutan dipilih agar tombol bersebelahan berbeda jelas.
export const VEHICLE_COLORS = [
  '#1d4ed8', // biru
  '#15803d', // hijau
  '#c2410c', // oranye
  '#b91c1c', // merah
  '#6d28d9', // ungu
  '#0f766e', // teal
  '#92400e', // cokelat
  '#be185d', // magenta
  '#0e7490', // sian
  '#4d7c0f', // zaitun
  '#3730a3', // indigo
  '#334155', // slate
  '#57534e', // abu hangat
  '#ca8a04', // kuning tua (teks gelap)
] as const;

export const PKJI_CLASSES: PkjiClass[] = ['SM', 'MP', 'KS', 'BB', 'TB', 'KTB'];
export const MAX_VEHICLE_TYPES = 14;

export const VEHICLE_ICONS: VehicleIcon[] = [
  'motor',
  'mobil',
  'sedan',
  'jip',
  'van',
  'bus',
  'truk',
  'trailer',
  'traktor',
  'sepeda',
];
const PKJI_ICON: Record<PkjiClass, VehicleIcon> = {
  SM: 'motor',
  MP: 'mobil',
  KS: 'van',
  BB: 'bus',
  TB: 'truk',
  KTB: 'sepeda',
};

/** Ikon jenis: pilihan pengguna, atau mengikuti padanan PKJI (jenis/sesi lama tanpa ikon). */
export const iconOf = (v: Pick<VehicleType, 'icon' | 'pkji'>): VehicleIcon | undefined =>
  v.icon ?? (v.pkji ? PKJI_ICON[v.pkji] : undefined);

type Row = [
  code: string,
  name: string,
  description: string,
  color: string,
  icon: VehicleIcon,
  pkji?: PkjiClass,
];

function types(rows: Row[], opts: { mp1?: boolean; notInSkr: string[] }): VehicleType[] {
  return rows.map(([code, name, description, color, icon, pkji], order) => ({
    code,
    name,
    description,
    color,
    icon,
    // ekr tidak di-hardcode: hanya MP = 1,00 di preset PKJI, sisanya diisi pengguna.
    ekr: opts.mp1 && code === 'MP' ? 1 : null,
    inSkr: !opts.notInSkr.includes(code),
    pkji,
    order,
  }));
}

const c = VEHICLE_COLORS;

export const PRESETS: ClassificationTemplate[] = [
  {
    id: 'preset-pkji2023',
    name: 'PKJI 2023',
    scheme: 'PKJI2023',
    builtIn: true,
    updatedAt: 0,
    vehicleTypes: types(
      [
        ['SM', 'Sepeda motor', 'Kendaraan bermotor roda 2 dan 3', c[0], 'motor', 'SM'],
        ['MP', 'Mobil penumpang', 'Sedan, jip, minibus, pikap, truk kecil', c[1], 'mobil', 'MP'],
        ['KS', 'Kendaraan sedang', 'Bus kecil/sedang, truk 2 sumbu 6 roda', c[2], 'van', 'KS'],
        ['BB', 'Bus besar', 'Bus 2 atau 3 sumbu', c[3], 'bus', 'BB'],
        ['TB', 'Truk besar', 'Truk 3 sumbu atau lebih, gandengan, trailer', c[4], 'truk', 'TB'],
        [
          'KTB',
          'Kendaraan tidak bermotor',
          'Sepeda, becak, gerobak, kereta kuda',
          c[11],
          'sepeda',
          'KTB',
        ],
      ],
      { mp1: true, notInSkr: ['KTB'] },
    ),
  },
  {
    id: 'preset-pkji2023-kota',
    name: 'PKJI 2023 Perkotaan',
    scheme: 'PKJI2023_KOTA',
    builtIn: true,
    updatedAt: 0,
    vehicleTypes: types(
      [
        ['SM', 'Sepeda motor', 'Kendaraan bermotor roda 2 dan 3', c[0], 'motor', 'SM'],
        ['MP', 'Mobil penumpang', 'Sedan, jip, minibus, pikap, truk kecil', c[1], 'mobil', 'MP'],
        [
          'KS',
          'Kendaraan sedang',
          'Bus dan truk; bus besar & truk besar dicatat di sini',
          c[2],
          'van',
          'KS',
        ],
        [
          'KTB',
          'Kendaraan tidak bermotor',
          'Sepeda, becak, gerobak, kereta kuda',
          c[11],
          'sepeda',
          'KTB',
        ],
      ],
      { mp1: true, notInSkr: ['KTB'] },
    ),
  },
  {
    id: 'preset-bm8',
    name: 'Bina Marga Gol. 1-8',
    scheme: 'BM8',
    builtIn: true,
    updatedAt: 0,
    vehicleTypes: types(
      [
        ['G1', 'Sepeda motor', 'Sepeda motor, skuter, kendaraan roda 3', c[0], 'motor', 'SM'],
        ['G2', 'Sedan, jip', 'Sedan, jip, station wagon', c[1], 'sedan', 'MP'],
        [
          'G3',
          'Opelet, minibus',
          'Opelet, pikap-opelet, suburban, kombi, minibus',
          c[5],
          'van',
          'MP',
        ],
        ['G4', 'Pikap, mikro truk', 'Pikap, mikro truk, mobil hantaran', c[9], 'truk', 'MP'],
        ['G5a', 'Bus kecil', 'Bus kecil', c[2], 'bus', 'KS'],
        ['G5b', 'Bus besar', 'Bus besar', c[3], 'bus', 'BB'],
        ['G6a', 'Truk ringan 2 sumbu', 'Truk ringan 2 sumbu', c[8], 'truk', 'KS'],
        ['G6b', 'Truk sedang 2 sumbu', 'Truk sedang 2 sumbu', c[10], 'truk', 'KS'],
        ['G7a', 'Truk 3 sumbu', 'Truk 3 sumbu', c[6], 'truk', 'TB'],
        ['G7b', 'Truk gandengan', 'Truk gandengan', c[4], 'trailer', 'TB'],
        ['G7c', 'Truk semi trailer', 'Truk semi trailer', c[7], 'trailer', 'TB'],
        ['G8', 'Tidak bermotor', 'Kendaraan tidak bermotor', c[11], 'sepeda', 'KTB'],
      ],
      { notInSkr: ['G8'] },
    ),
  },
  {
    id: 'preset-sederhana',
    name: 'Sederhana',
    scheme: 'SEDERHANA',
    builtIn: true,
    updatedAt: 0,
    vehicleTypes: types(
      [
        ['MTR', 'Motor', 'Sepeda motor', c[0], 'motor', 'SM'],
        ['MBL', 'Mobil', 'Mobil penumpang dan pikap', c[1], 'mobil', 'MP'],
        ['BUS', 'Bus', 'Semua bus', c[3], 'bus'],
        ['TRK', 'Truk', 'Semua truk', c[6], 'truk'],
        ['LAIN', 'Lainnya', 'Kendaraan lain / tidak bermotor', c[11], 'sepeda'],
      ],
      { notInSkr: ['LAIN'] },
    ),
  },
];

export const DEFAULT_TEMPLATE_ID = PRESETS[0].id;

/** Salinan kustom yang bisa diedit (preset tetap read-only). */
export function copyOf(
  tpl: ClassificationTemplate,
  id: string,
  name: string,
  now: number,
): ClassificationTemplate {
  return { ...structuredClone(tpl), id, name, scheme: 'KUSTOM', builtIn: false, updatedAt: now };
}

export interface TemplateError {
  index?: number; // jenis ke- (0-based); kosong = level template
  message: string;
}

export const ERR = { ...t.validation, count: t.validation.count(MAX_VEHICLE_TYPES) };

export function validateTemplate(tpl: Pick<ClassificationTemplate, 'name' | 'vehicleTypes'>) {
  const errors: TemplateError[] = [];
  if (!tpl.name.trim()) errors.push({ message: ERR.name });
  const n = tpl.vehicleTypes.length;
  if (n < 1 || n > MAX_VEHICLE_TYPES) errors.push({ message: ERR.count });
  const upper = tpl.vehicleTypes.map((v) => v.code.trim().toUpperCase());
  tpl.vehicleTypes.forEach((v, index) => {
    const code = v.code.trim();
    if (!/^[A-Za-z0-9]{1,5}$/.test(code)) errors.push({ index, message: ERR.code });
    else if (upper.indexOf(upper[index]) !== upper.lastIndexOf(upper[index])) {
      errors.push({ index, message: ERR.dupCode }); // tandai semua baris yang bentrok
    }
    if (!v.name.trim()) errors.push({ index, message: ERR.typeName });
    if (v.ekr !== null && !(Number.isFinite(v.ekr) && v.ekr > 0)) {
      errors.push({ index, message: ERR.ekr });
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(v.color)) errors.push({ index, message: ERR.color });
  });
  return errors;
}

/** Salin ekr kelas PKJI ke tiap jenis sesuai padanannya (hanya jenis yang masuk skr). */
export function fillEkrFromPkji(
  vehicleTypes: VehicleType[],
  pkjiEkr: Partial<Record<PkjiClass, number | null>>,
): VehicleType[] {
  return vehicleTypes.map((v) => {
    const e = v.pkji ? pkjiEkr[v.pkji] : undefined;
    return v.inSkr && e !== undefined && e !== null ? { ...v, ekr: e } : v;
  });
}

/** Teks putih atau gelap, mana yang kontrasnya lebih tinggi terhadap warna tombol. */
export function textOn(hex: string): string {
  const lin = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * lin(1) + 0.7152 * lin(3) + 0.0722 * lin(5);
  const vsWhite = 1.05 / (l + 0.05);
  const vsInk = (l + 0.05) / 0.0596; // luminans #17191b ≈ 0,0096
  return vsWhite >= vsInk ? '#ffffff' : '#17191b';
}
