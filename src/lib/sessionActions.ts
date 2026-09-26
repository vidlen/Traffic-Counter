import { t } from '../i18n/id';
import type {
  CountEvent,
  Gap,
  IntervalRecord,
  Movement,
  NoteCategory,
  NoteEvent,
  Session,
  VehicleType,
} from '../types';
import { clock } from './clock';
import { db } from './db';
import { closeInterval, engineState, type Phase, pickUndo } from './engine';
import { alignUp, buildSchedule } from './schedule';
import { isActive } from './session';

// Operasi Dexie untuk sesi (efek samping). Logika murni ada di engine.ts / schedule.ts.

const eventsBetween = (id: string, from: number, to: number) =>
  db.events.where('[sessionId+t]').between([id, from], [id, to], true, false).toArray();

export const scheduleOf = (s: Session) =>
  s.startedAt === undefined ? [] : buildSchedule(s, s.startedAt);

export async function deleteSession(id: string): Promise<void> {
  await db.transaction('rw', [db.sessions, db.events, db.intervals, db.notes], async () => {
    await db.events.where('sessionId').equals(id).delete();
    await db.intervals.where('sessionId').equals(id).delete();
    await db.notes.where('sessionId').equals(id).delete();
    await db.sessions.delete(id);
  });
}

function openManual(s: Session, start: number, index: number): IntervalRecord {
  const end = start + s.intervalMin * 60_000;
  return {
    sessionId: s.id,
    index,
    start,
    end,
    actualStart: start,
    actualEnd: end,
    status: 'TERBUKA',
    gapMs: 0,
    counts: {},
  };
}

/** Mulai sesi dari draf. Mengembalikan pesan kesalahan, atau null bila berhasil. */
export async function startSession(draft: Session): Promise<string | null> {
  return db.transaction('rw', [db.sessions, db.intervals], async () => {
    const others = await db.sessions.where('status').anyOf('BERJALAN', 'MENUNGGU').toArray();
    if (others.some((o) => o.id !== draft.id)) return t.counter.otherActive;
    const testClock = draft.testMode ? clock.anchor(draft.testSpeed ?? 60) : undefined;
    clock.use(testClock ?? null);
    const now = clock.now();
    const s: Session = {
      ...draft,
      status: 'MENUNGGU',
      startedAt: now,
      lastAliveAt: now,
      gaps: [],
      testClock,
    };
    if (s.timerMode === 'MENERUS') {
      const list = buildSchedule(s, now);
      if (!list.length || list[list.length - 1].end <= now) return t.counter.schedulePast;
    } else {
      const start = s.manual?.snapToClock ? alignUp(now, s.intervalMin) : now;
      if (start === now) {
        await db.intervals.put(openManual(s, now, 1));
        s.status = 'BERJALAN';
      } else s.pendingStart = start;
    }
    await db.sessions.put(s);
    return null;
  });
}

export interface AdvanceResult {
  closed: IntervalRecord[];
  phase: Phase;
  opened: boolean; // interval manual terjadwal dibuka
}

/**
 * Langkah mesin (idempoten): buka interval manual yang jatuh tempo, tutup semua interval
 * yang sudah habis (termasuk catch-up setelah app tertutup), lalu perbarui status sesi.
 */
export async function advance(id: string, now: number): Promise<AdvanceResult> {
  return db.transaction('rw', [db.sessions, db.intervals, db.events], async () => {
    const s = await db.sessions.get(id);
    if (!s || !isActive(s)) return { closed: [], phase: 'SELESAI' as Phase, opened: false };
    const schedule = scheduleOf(s);
    let records = await db.intervals.where('sessionId').equals(id).toArray();
    let st = engineState(s, schedule, records, now);
    let opened = false;

    if (st.startManualAt !== undefined) {
      const rec = openManual(s, st.startManualAt, records.length + 1);
      await db.intervals.put(rec);
      s.pendingStart = undefined;
      records = [...records, rec];
      opened = true;
      st = engineState(s, schedule, records, now);
    }

    const closed: IntervalRecord[] = [];
    for (const iv of st.due) {
      const rec = closeInterval(s, iv, await eventsBetween(id, iv.start, iv.end), now);
      await db.intervals.put(rec);
      closed.push(rec);
    }
    if (closed.length) {
      records = records.filter((r) => !closed.some((c) => c.index === r.index)).concat(closed);
      st = engineState(s, schedule, records, now);
    }

    const patch: Partial<Session> = {};
    if (opened) patch.pendingStart = undefined;
    if (st.phase !== s.status) patch.status = st.phase;
    if (st.phase === 'SELESAI' && s.endedAt === undefined) patch.endedAt = st.lastEnd ?? now;
    if (Object.keys(patch).length) await db.sessions.update(id, patch);
    return { closed, phase: st.phase, opened };
  });
}

export async function recordGap(id: string, gap: Gap): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const s = await db.sessions.get(id);
    if (s) await db.sessions.update(id, { gaps: [...s.gaps, gap], lastAliveAt: gap.to });
  });
}

export const heartbeat = (id: string, now: number) => db.sessions.update(id, { lastAliveAt: now });

export function newEvent(
  sessionId: string,
  positionKey: string,
  movement: Movement | null,
  vehicleCode: string,
  kind: 'TAP' | 'KOREKSI',
  now: number,
): CountEvent {
  return {
    id: crypto.randomUUID(),
    sessionId,
    t: now,
    positionKey,
    movement,
    vehicleCode,
    delta: kind === 'TAP' ? 1 : -1,
    kind,
  };
}

/** Ketukan (+1) atau koreksi (−1) — ditulis langsung ke IndexedDB. */
export async function recordTap(...args: Parameters<typeof newEvent>): Promise<CountEvent> {
  const e = newEvent(...args);
  await db.events.add(e);
  return e;
}

/** Batalkan ketukan terakhir di interval berjalan; mengembalikan ketukan yang dibatalkan. */
export async function undoLast(
  sessionId: string,
  intervalStart: number,
  now: number,
): Promise<CountEvent | undefined> {
  return db.transaction('rw', db.events, async () => {
    const events = await eventsBetween(sessionId, intervalStart, Infinity);
    const target = pickUndo(events, intervalStart);
    if (!target) return undefined;
    await db.events.add({
      id: crypto.randomUUID(),
      sessionId,
      t: Math.max(now, target.t),
      positionKey: target.positionKey,
      movement: target.movement,
      vehicleCode: target.vehicleCode,
      delta: -1,
      kind: 'UNDO',
      undoOf: target.id,
    });
    return target;
  });
}

export async function addNote(
  sessionId: string,
  category: NoteCategory,
  text: string | undefined,
  now: number,
): Promise<NoteEvent> {
  const note: NoteEvent = { id: crypto.randomUUID(), sessionId, t: now, category, text };
  await db.notes.add(note);
  return note;
}

/** MANUAL: tombol "Mulai interval berikutnya" (langsung, atau menunggu kelipatan jam). */
export async function requestManualStart(id: string, now: number): Promise<void> {
  await db.transaction('rw', [db.sessions, db.intervals], async () => {
    const s = await db.sessions.get(id);
    if (!s || s.timerMode !== 'MANUAL' || !isActive(s)) return;
    const records = await db.intervals.where('sessionId').equals(id).toArray();
    if (records.some((r) => r.status === 'TERBUKA') || s.pendingStart !== undefined) return;
    const start = s.manual?.snapToClock ? alignUp(now, s.intervalMin) : now;
    if (start > now) {
      await db.sessions.update(id, { pendingStart: start, status: 'MENUNGGU' });
      return;
    }
    await db.intervals.put(openManual(s, now, records.length + 1));
    await db.sessions.update(id, { status: 'BERJALAN' });
  });
}

/** "Mulai sekarang saja": batalkan penantian kelipatan jam, jadwal dihitung dari sekarang. */
export async function startNowUnaligned(id: string, now: number): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const s = await db.sessions.get(id);
    if (!s || s.status !== 'MENUNGGU') return;
    if (s.timerMode === 'MANUAL') {
      await db.sessions.update(id, { pendingStart: now });
    } else if (s.schedule.kind === 'SEKARANG') {
      await db.sessions.update(id, {
        schedule: { ...s.schedule, alignToClock: false },
        startedAt: now,
      });
    }
  });
}

/** Selesaikan lebih awal: interval berjalan ditutup PARSIAL (actualEnd = now). */
export async function finishSession(id: string, now: number): Promise<AdvanceResult> {
  await db.sessions.update(id, { endedAt: now });
  return advance(id, now);
}

export async function updateEkr(id: string, vehicleTypes: VehicleType[]): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const s = await db.sessions.get(id);
    if (s) await db.sessions.update(id, { classification: { ...s.classification, vehicleTypes } });
  });
}
