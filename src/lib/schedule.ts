import { t } from '../i18n/id';
import type { Session } from '../types';
import { DAY, localTime, MIN, parseHm } from './time';

export const DIVISORS_OF_60 = [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60];
export const INTERVAL_CHOICES = [5, 10, 15, 20, 30, 60];

export interface ScheduledInterval {
  index: number; // mulai dari 1
  start: number;
  end: number;
  blockLabel?: string;
}

type Timing = Pick<Session, 'intervalMin' | 'timerMode' | 'schedule' | 'date' | 'manual'>;

/** Kelipatan interval berikutnya pada jam lokal (07.13.20 → 07.15.00 untuk 15 menit). */
export function alignUp(t0: number, intervalMin: number): number {
  const d = new Date(t0);
  const intoHour = (d.getMinutes() * 60 + d.getSeconds()) * 1000 + d.getMilliseconds();
  const rem = intoHour % (intervalMin * MIN);
  return rem === 0 ? t0 : t0 - rem + intervalMin * MIN;
}

/** Kemunculan pertama jam 'menit sejak 00.00' pada atau setelah t0. */
function nextAt(t0: number, minutes: number): number {
  const d = new Date(t0);
  const same = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, minutes).getTime();
  return same >= t0
    ? same
    : new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, minutes).getTime();
}

/**
 * Daftar interval mode MENERUS (MANUAL → []).
 * SEKARANG: dari startMs (atau kelipatan berikutnya), N interval atau sampai jam HH:mm.
 * BLOK: blok berurutan; blok pertama di tanggal sesi, blok berikutnya pada kemunculan
 * pertama jam mulainya setelah blok sebelumnya selesai (boleh lewat tengah malam).
 */
export function buildSchedule(s: Timing, startMs: number): ScheduledInterval[] {
  if (s.timerMode !== 'MENERUS') return [];
  const step = s.intervalMin * MIN;
  const out: ScheduledInterval[] = [];
  const fill = (from: number, to: number, blockLabel?: string) => {
    for (let x = from; x + step <= to; x += step) {
      out.push({ index: out.length + 1, start: x, end: x + step, blockLabel });
    }
  };
  const sc = s.schedule;
  if (sc.kind === 'SEKARANG') {
    const first = sc.alignToClock ? alignUp(startMs, s.intervalMin) : startMs;
    if (sc.count) {
      fill(first, first + sc.count * step);
    } else {
      const until = parseHm(sc.until);
      if (until !== null) fill(first, nextAt(first + 1, until));
    }
    return out;
  }
  let prevEnd = 0;
  for (const [i, b] of sc.blocks.entries()) {
    const from = parseHm(b.start);
    const to = parseHm(b.end);
    if (from === null || to === null) return [];
    const start = i === 0 ? localTime(s.date, from) : nextAt(prevEnd, from);
    const end = start + (((to - from + 1440) % 1440) * MIN || DAY);
    fill(start, end, b.label.trim() || undefined);
    prevEnd = end;
  }
  return out;
}

/** Pesan kesalahan pengaturan waktu (kosong = valid). */
export function validateTiming(s: Timing): string[] {
  const e = t.timing;
  const errors: string[] = [];
  if (!DIVISORS_OF_60.includes(s.intervalMin)) errors.push(e.interval);
  if (s.timerMode === 'MANUAL') {
    const max = s.manual?.maxIntervals;
    if (max !== undefined && !(Number.isInteger(max) && max >= 1)) errors.push(e.maxIntervals);
    return errors;
  }
  const sc = s.schedule;
  if (sc.kind === 'SEKARANG') {
    if (sc.count !== undefined) {
      if (!(Number.isInteger(sc.count) && sc.count >= 1 && sc.count <= 1440)) {
        errors.push(e.count);
      }
    } else if (parseHm(sc.until) === null) errors.push(e.until);
    return errors;
  }
  if (!sc.blocks.length) return [...errors, e.noBlocks];
  for (const b of sc.blocks) {
    const name = b.label.trim() || `${b.start}-${b.end}`;
    const from = parseHm(b.start);
    const to = parseHm(b.end);
    if (from === null || to === null) errors.push(e.blockTime(name));
    else if (from === to) errors.push(e.blockZero(name));
    else if (((to - from + 1440) % 1440) % s.intervalMin !== 0) errors.push(e.blockMultiple(name));
  }
  if (errors.length) return errors;
  const list = buildSchedule(s, 0);
  if (list.length && list[list.length - 1].end - list[0].start > DAY) errors.push(e.blockOverlap);
  return errors;
}

export interface SchedulePreview {
  count: number;
  first?: ScheduledInterval;
  last?: ScheduledInterval;
  countedMs: number; // total durasi hitung (jumlah × panjang interval)
}

export function previewSchedule(list: ScheduledInterval[]): SchedulePreview {
  return {
    count: list.length,
    first: list[0],
    last: list[list.length - 1],
    countedMs: list.reduce((a, x) => a + x.end - x.start, 0),
  };
}
