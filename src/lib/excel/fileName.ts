import type { Session } from '../../types';

/** Huruf (tanpa diakritik), angka, `_`, `-`; spasi → `_`. */
export function sanitize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^[_-]+|[_-]+$/g, '');
}

/** TC_{lokasi}_{posisi}_{YYYYMMDD}_{surveyor}.xlsx */
export function fileName(
  s: Pick<Session, 'location' | 'countedKeys' | 'date' | 'surveyor'>,
): string {
  const parts = [
    'TC',
    sanitize(s.location) || 'Lokasi',
    sanitize(s.countedKeys.join('-')),
    s.date.replaceAll('-', ''),
    sanitize(s.surveyor) || 'Surveyor',
  ];
  return `${parts.join('_')}.xlsx`;
}
