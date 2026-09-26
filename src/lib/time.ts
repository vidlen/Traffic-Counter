import { format } from 'date-fns';
import { id } from 'date-fns/locale/id';

// Format waktu gaya Indonesia: tanggal dd/mm/yyyy, jam HH.mm (UI).
export const MIN = 60_000;
export const DAY = 24 * 60 * MIN;

export const fmtDate = (ms: number) => format(ms, 'dd/MM/yyyy');
export const fmtTime = (ms: number) => format(ms, 'HH.mm');
export const fmtClock = (ms: number) => format(ms, 'HH.mm.ss');
export const fmtDay = (ms: number) => format(ms, 'EEEE', { locale: id });
export const fmtDateTime = (ms: number) => format(ms, 'dd/MM/yyyy HH.mm');
export const isoDate = (ms: number) => format(ms, 'yyyy-MM-dd');

/** Awal hari lokal dari 'YYYY-MM-DD' ditambah n menit (boleh > 1440 → hari berikutnya). */
export function localTime(date: string, minutes: number): number {
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(y, mo - 1, d, 0, minutes).getTime();
}

/** 'HH:mm' atau 'HH.mm' → menit sejak 00.00; null bila tidak valid. */
export function parseHm(s: string | undefined): number | null {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec((s ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  return h < 24 && mm < 60 ? h * 60 + mm : null;
}

/** '07:15' → '07.15' untuk tampilan. */
export const fmtHm = (s: string) => s.replace(':', '.');

/** Rentang interval, diberi tanggal bila tidak jatuh di tanggal referensi (tanggal sesi). */
export function fmtRange(start: number, end: number, refDate?: string): string {
  const range = `${fmtTime(start)}-${fmtTime(end)}`;
  return refDate && isoDate(start) !== refDate ? `${format(start, 'dd/MM')} ${range}` : range;
}

export function fmtDuration(ms: number): string {
  const total = Math.round(ms / MIN);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h} jam ${m} menit`;
  return h ? `${h} jam` : `${m} menit`;
}

/** Hitung mundur mm:ss (atau h:mm:ss bila ≥ 1 jam). */
export function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Serial tanggal Excel dalam waktu LOKAL. Jangan tulis objek Date ke ExcelJS (dianggap UTC).
 * tzOffset negatif untuk WIB (−420 menit) sehingga hasilnya maju 7 jam ke waktu lokal.
 */
export function toExcelSerial(ms: number): number {
  const tzOffsetMs = new Date(ms).getTimezoneOffset() * MIN;
  return (ms - tzOffsetMs) / DAY + 25569;
}
