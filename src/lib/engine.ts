import type { CountEvent, Gap, IntervalRecord, IntervalStatus, Session } from '../types';
import type { ScheduledInterval } from './schedule';
import { countKey } from './session';

// Mesin interval: fungsi murni (tanpa Dexie/DOM). Waktu selalu diberikan sebagai parameter.

export const GAP_THRESHOLD_MS = 15_000; // app dianggap tidak aktif bila jeda > 15 s
export const HEARTBEAT_MS = 5_000;

export type Phase = 'MENUNGGU' | 'BERJALAN' | 'SELESAI';

export interface EngineState {
  phase: Phase;
  current?: ScheduledInterval; // interval berjalan
  nextStart?: number; // MENUNGGU: mulai otomatis pada jam ini (kosong = tunggu tombol)
  nextBlock?: string; // MENUNGGU: nama blok berikutnya
  due: ScheduledInterval[]; // sudah habis tapi belum ditutup
  startManualAt?: number; // MANUAL: saatnya membuka interval yang dijadwalkan (snap)
  total?: number; // jumlah interval terjadwal / maksimum manual
  lastEnd?: number; // akhir interval terakhir (selesai alami)
}

/** Total celah (digabung, tanpa hitung ganda) yang jatuh di [a, b). */
export function gapOverlap(gaps: Gap[], a: number, b: number): number {
  let total = 0;
  let from = -Infinity;
  let to = -Infinity;
  const flush = () => {
    total += Math.max(0, Math.min(to, b) - Math.max(from, a));
  };
  for (const g of [...gaps].sort((x, y) => x.from - y.from)) {
    if (g.from > to) {
      flush();
      from = g.from;
      to = g.to;
    } else to = Math.max(to, g.to);
  }
  flush();
  return total;
}

/** Status interval dari jadwal, jam mulai/selesai sesi, dan celah tidak aktif (§8.5). */
export function intervalOutcome(
  iv: { start: number; end: number },
  s: Pick<Session, 'startedAt' | 'endedAt' | 'gaps'>,
): { actualStart: number; actualEnd: number; gapMs: number; status: IntervalStatus } {
  const actualStart = Math.min(Math.max(iv.start, s.startedAt ?? iv.start), iv.end);
  const actualEnd = Math.max(actualStart, Math.min(iv.end, s.endedAt ?? iv.end));
  const gapMs = gapOverlap(s.gaps, actualStart, actualEnd);
  const status: IntervalStatus =
    actualEnd - actualStart - gapMs <= 0
      ? 'TERLEWAT'
      : gapMs > 0
        ? 'TERPUTUS'
        : actualStart > iv.start || actualEnd < iv.end
          ? 'PARSIAL'
          : 'LENGKAP';
  return { actualStart, actualEnd, gapMs, status };
}

/** Jumlah per tombol dari event (append-only). Tidak pernah negatif. */
export function sumCounts(
  events: Pick<CountEvent, 'positionKey' | 'movement' | 'vehicleCode' | 'delta'>[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) {
    const k = countKey(e.positionKey, e.movement, e.vehicleCode);
    out[k] = Math.max(0, (out[k] ?? 0) + e.delta);
  }
  return out;
}

/** Tutup interval = agregasi event [start, end) → IntervalRecord terkunci. */
export function closeInterval(
  s: Session,
  iv: ScheduledInterval,
  events: CountEvent[],
  now: number,
): IntervalRecord {
  const o = intervalOutcome(iv, s);
  return {
    sessionId: s.id,
    index: iv.index,
    start: iv.start,
    end: iv.end,
    blockLabel: iv.blockLabel,
    ...o,
    counts:
      o.status === 'TERLEWAT'
        ? {}
        : sumCounts(events.filter((e) => e.t >= iv.start && e.t < iv.end)),
    savedAt: now,
  };
}

/** Posisi sesi pada waktu `now`: fase, interval berjalan, dan interval yang harus ditutup. */
export function engineState(
  s: Session,
  schedule: ScheduledInterval[],
  records: IntervalRecord[],
  now: number,
): EngineState {
  const cutoff = s.endedAt ?? Infinity;
  const closed = new Set(records.filter((r) => r.status !== 'TERBUKA').map((r) => r.index));

  if (s.timerMode === 'MANUAL') {
    const total = s.manual?.maxIntervals;
    const open = records.find((r) => r.status === 'TERBUKA');
    const iv = open && { index: open.index, start: open.start, end: open.end };
    const due = iv && Math.min(iv.end, cutoff) <= now ? [iv] : [];
    if (iv && !due.length) return { phase: 'BERJALAN', current: iv, due, total };
    if (s.endedAt !== undefined || (total !== undefined && closed.size + due.length >= total)) {
      return { phase: 'SELESAI', due, total, lastEnd: iv?.end };
    }
    const pend = s.pendingStart;
    return {
      phase: 'MENUNGGU',
      due,
      total,
      nextStart: pend,
      startManualAt: pend !== undefined && pend <= now ? pend : undefined,
    };
  }

  const live = schedule.filter((iv) => iv.start < cutoff);
  const due = live.filter((iv) => !closed.has(iv.index) && Math.min(iv.end, cutoff) <= now);
  const total = schedule.length;
  const current = live.find((iv) => iv.start <= now && now < iv.end && now < cutoff);
  if (current) return { phase: 'BERJALAN', current, due, total };
  const next = live.find((iv) => iv.start > now);
  if (next && s.endedAt === undefined) {
    return { phase: 'MENUNGGU', nextStart: next.start, nextBlock: next.blockLabel, due, total };
  }
  return { phase: 'SELESAI', due, total, lastEnd: live.at(-1)?.end };
}

/** Celah tidak aktif bila jeda sejak terakhir terlihat melebihi ambang (skala Mode uji). */
export function detectGap(lastSeen: number, now: number, speed = 1): Gap | null {
  return now - lastSeen > GAP_THRESHOLD_MS * speed ? { from: lastSeen, to: now } : null;
}

/**
 * Ketukan terakhir yang masih bisa dibatalkan di interval berjalan: TAP yang belum di-undo
 * dan tombolnya masih > 0 (undo tidak boleh membuat negatif, tidak menembus interval terkunci).
 */
export function pickUndo(events: CountEvent[], intervalStart: number): CountEvent | undefined {
  const inInterval = events
    .filter((e) => e.t >= intervalStart)
    .sort((a, b) => a.t - b.t || (a.seq ?? 0) - (b.seq ?? 0));
  const counts = sumCounts(inInterval);
  const undone = new Set(inInterval.filter((e) => e.kind === 'UNDO').map((e) => e.undoOf));
  for (let i = inInterval.length - 1; i >= 0; i--) {
    const e = inInterval[i];
    if (e.kind !== 'TAP' || undone.has(e.id)) continue;
    if ((counts[countKey(e.positionKey, e.movement, e.vehicleCode)] ?? 0) > 0) return e;
  }
  return undefined;
}
