import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CountEvent, IntervalRecord, Session } from '../types';
import { clock } from './clock';
import { db } from './db';
import {
  closeInterval,
  detectGap,
  engineState,
  GAP_THRESHOLD_MS,
  intervalOutcome,
  pickUndo,
  sumCounts,
} from './engine';
import { PRESETS } from './presets';
import { buildSchedule } from './schedule';
import {
  advance,
  finishSession,
  recordGap,
  recordTap,
  requestManualStart,
  startSession,
  undoLast,
} from './sessionActions';
import { MIN } from './time';

const at = (h: number, m = 0, s = 0, d = 5) => new Date(2026, 0, d, h, m, s).getTime();

function session(over: Partial<Session> = {}): Session {
  return {
    id: 's1',
    project: '',
    location: 'Jl. Uji',
    surveyor: 'Surveyor',
    date: '2026-01-05',
    surveyType: 'RUAS',
    positions: [{ key: 'A', label: 'Arah A', movements: null }],
    countedKeys: ['A'],
    classification: structuredClone(PRESETS[0]),
    intervalMin: 15,
    timerMode: 'MENERUS',
    schedule: { kind: 'SEKARANG', alignToClock: false, count: 4 },
    status: 'BERJALAN',
    gaps: [],
    testMode: false,
    createdAt: 0,
    startedAt: at(7),
    ...over,
  };
}

let seq = 0;
const ev = (
  t: number,
  code: string,
  kind: CountEvent['kind'] = 'TAP',
  undoOf?: string,
): CountEvent => ({
  seq: ++seq,
  id: `e${seq}`,
  sessionId: 's1',
  t,
  positionKey: 'A',
  movement: null,
  vehicleCode: code,
  delta: kind === 'TAP' ? 1 : -1,
  kind,
  undoOf,
});

describe('engine (murni)', () => {
  it('ketukan tepat di t = end masuk interval berikutnya', () => {
    const s = session();
    const [iv1, iv2] = buildSchedule(s, s.startedAt!);
    const events = [ev(at(7, 14, 59) + 999, 'SM'), ev(at(7, 15), 'SM'), ev(at(7, 15), 'MP')];
    expect(closeInterval(s, iv1, events, at(7, 15)).counts).toEqual({ 'A|-|SM': 1 });
    expect(closeInterval(s, iv2, events, at(7, 30)).counts).toEqual({ 'A|-|SM': 1, 'A|-|MP': 1 });
    expect(engineState(s, [iv1, iv2], [], at(7, 15)).current?.index).toBe(2);
  });

  it('undo tidak membuat negatif dan tidak menembus interval terkunci', () => {
    const old = ev(at(7, 10), 'SM'); // interval 1, sudah terkunci
    const sm = ev(at(7, 16), 'SM');
    const mp = ev(at(7, 17), 'MP');
    const undoMp = ev(at(7, 18), 'MP', 'UNDO', mp.id);
    expect(pickUndo([old, sm, mp], at(7, 15))?.id).toBe(mp.id);
    expect(pickUndo([old, sm, mp, undoMp], at(7, 15))?.id).toBe(sm.id);
    const undoSm = ev(at(7, 19), 'SM', 'UNDO', sm.id);
    expect(pickUndo([old, sm, mp, undoMp, undoSm], at(7, 15))).toBeUndefined();
    // Koreksi sudah menurunkan SM ke 0 → undo tidak boleh membuatnya −1.
    const kor = ev(at(7, 20), 'SM', 'KOREKSI');
    expect(pickUndo([sm, kor], at(7, 15))).toBeUndefined();
    expect(sumCounts([sm, kor, ev(at(7, 21), 'SM', 'KOREKSI')])).toEqual({ 'A|-|SM': 0 });
  });

  it('celah di tengah interval → TERPUTUS dengan gapMs benar; menutupi penuh → TERLEWAT', () => {
    const gaps = [{ from: at(7, 5), to: at(7, 8) }];
    expect(intervalOutcome({ start: at(7), end: at(7, 15) }, session({ gaps }))).toMatchObject({
      status: 'TERPUTUS',
      gapMs: 3 * MIN,
    });
    const full = [{ from: at(7, 14), to: at(7, 31) }];
    expect(
      intervalOutcome({ start: at(7, 15), end: at(7, 30) }, session({ gaps: full })),
    ).toMatchObject({
      status: 'TERLEWAT',
      gapMs: 15 * MIN,
    });
    // Celah dicatat dua kali tidak dihitung ganda.
    const twice = [...gaps, ...gaps];
    expect(intervalOutcome({ start: at(7), end: at(7, 15) }, session({ gaps: twice })).gapMs).toBe(
      3 * MIN,
    );
  });

  it('mulai terlambat dalam blok / selesai lebih awal → PARSIAL; sebelum mulai → TERLEWAT', () => {
    const late = session({ startedAt: at(6, 7) });
    expect(intervalOutcome({ start: at(6), end: at(6, 15) }, late)).toMatchObject({
      status: 'PARSIAL',
      actualStart: at(6, 7),
    });
    const early = session({ endedAt: at(7, 10) });
    expect(intervalOutcome({ start: at(7), end: at(7, 15) }, early)).toMatchObject({
      status: 'PARSIAL',
      actualEnd: at(7, 10),
    });
    expect(intervalOutcome({ start: at(5, 45), end: at(6) }, late).status).toBe('TERLEWAT');
    expect(intervalOutcome({ start: at(7), end: at(7, 15) }, session()).status).toBe('LENGKAP');
  });

  it('fase: MENUNGGU sebelum/antara blok, BERJALAN, SELESAI', () => {
    const s = session({
      schedule: {
        kind: 'BLOK',
        blocks: [
          { label: 'Pagi', start: '06:00', end: '06:30' },
          { label: 'Siang', start: '11:00', end: '11:15' },
        ],
      },
      startedAt: at(5, 50),
    });
    const list = buildSchedule(s, s.startedAt!);
    expect(engineState(s, list, [], at(5, 55))).toMatchObject({
      phase: 'MENUNGGU',
      nextStart: at(6),
    });
    expect(engineState(s, list, [], at(6, 20)).phase).toBe('BERJALAN');
    const between = engineState(s, list, [], at(8));
    expect(between).toMatchObject({ phase: 'MENUNGGU', nextStart: at(11) });
    expect(between.due.map((x) => x.index)).toEqual([1, 2]);
    const end = engineState(s, list, [], at(12));
    expect(end).toMatchObject({ phase: 'SELESAI', lastEnd: at(11, 15) });
  });

  it('MANUAL: jadwal snap memicu pembukaan; batas maksimum → SELESAI', () => {
    const s = session({ timerMode: 'MANUAL', manual: { snapToClock: true, maxIntervals: 1 } });
    expect(engineState({ ...s, pendingStart: at(7, 15) }, [], [], at(7, 16)).startManualAt).toBe(
      at(7, 15),
    );
    const done: IntervalRecord = {
      sessionId: 's1',
      index: 1,
      start: at(7),
      end: at(7, 15),
      actualStart: at(7),
      actualEnd: at(7, 15),
      status: 'LENGKAP',
      gapMs: 0,
      counts: {},
    };
    expect(engineState(s, [], [done], at(7, 20)).phase).toBe('SELESAI');
  });

  it('celah hanya bila jeda > 15 s (diskalakan untuk Mode uji)', () => {
    expect(detectGap(0, GAP_THRESHOLD_MS)).toBeNull();
    expect(detectGap(0, GAP_THRESHOLD_MS + 1)).toEqual({ from: 0, to: GAP_THRESHOLD_MS + 1 });
    expect(detectGap(0, 60 * GAP_THRESHOLD_MS, 60)).toBeNull();
  });
});

describe('engine + Dexie (jam palsu)', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await Promise.all(db.tables.map((tb) => tb.clear()));
  });
  afterEach(() => {
    clock.use(null);
    vi.useRealTimers();
  });

  const draft = (over: Partial<Session> = {}) =>
    session({ status: 'DRAFT', startedAt: undefined, ...over });

  it('menyimpan otomatis saat timer habis; refresh di tengah interval tidak menghilangkan hitungan', async () => {
    vi.setSystemTime(at(7));
    expect(await startSession(draft())).toBeNull();
    await recordTap('s1', 'A', null, 'SM', 'TAP', clock.now());
    await recordTap('s1', 'A', null, 'MP', 'TAP', clock.now());
    vi.setSystemTime(at(7, 10));
    await recordTap('s1', 'A', null, 'SM', 'TAP', clock.now());
    expect((await advance('s1', clock.now())).closed).toEqual([]); // "refresh": data tetap di DB
    await undoLast('s1', at(7), clock.now()); // batalkan SM terakhir
    vi.setSystemTime(at(7, 15));
    const r = await advance('s1', clock.now());
    expect(r.closed).toHaveLength(1);
    expect(r.closed[0]).toMatchObject({
      index: 1,
      status: 'LENGKAP',
      counts: { 'A|-|SM': 1, 'A|-|MP': 1 },
    });
    expect((await db.sessions.get('s1'))?.status).toBe('BERJALAN');
  });

  it('app tertutup lalu dibuka melewati akhir jadwal → TERPUTUS/TERLEWAT benar, sesi SELESAI', async () => {
    vi.setSystemTime(at(7));
    await startSession(draft());
    vi.setSystemTime(at(7, 20));
    await recordTap('s1', 'A', null, 'SM', 'TAP', clock.now());
    await advance('s1', clock.now()); // interval 1 LENGKAP
    // App tertutup 07.22 (heartbeat terakhir), dibuka lagi 08.10.
    vi.setSystemTime(at(8, 10));
    const gap = detectGap(at(7, 22), clock.now());
    expect(gap).not.toBeNull();
    await recordGap('s1', gap!);
    const r = await advance('s1', clock.now());
    expect(r.closed.map((x) => [x.index, x.status])).toEqual([
      [2, 'TERPUTUS'],
      [3, 'TERLEWAT'],
      [4, 'TERLEWAT'],
    ]);
    expect(r.closed[0].gapMs).toBe(8 * MIN);
    expect(r.closed[0].counts).toEqual({ 'A|-|SM': 1 });
    expect(r.closed[1].counts).toEqual({});
    const s = await db.sessions.get('s1');
    expect(s).toMatchObject({ status: 'SELESAI', endedAt: at(8) });
  });

  it('tab ditutup 2 menit di tengah interval → interval itu TERPUTUS', async () => {
    vi.setSystemTime(at(7));
    await startSession(draft());
    vi.setSystemTime(at(7, 7));
    await recordGap('s1', detectGap(at(7, 5), clock.now())!);
    vi.setSystemTime(at(7, 15));
    const r = await advance('s1', clock.now());
    expect(r.closed[0]).toMatchObject({ status: 'TERPUTUS', gapMs: 2 * MIN });
  });

  it('selesai lebih awal → interval berjalan PARSIAL dan sesi SELESAI', async () => {
    vi.setSystemTime(at(7));
    await startSession(draft());
    vi.setSystemTime(at(7, 20));
    await advance('s1', clock.now());
    const r = await finishSession('s1', clock.now());
    expect(r.closed.map((x) => [x.index, x.status, x.actualEnd])).toEqual([
      [2, 'PARSIAL', at(7, 20)],
    ]);
    expect(r.phase).toBe('SELESAI');
    expect(await db.intervals.count()).toBe(2);
  });

  it('Mode uji ×60: sesi 12 jam (48 × 15 menit) selesai dalam 12 menit nyata', async () => {
    vi.setSystemTime(at(6));
    const test = draft({
      testMode: true,
      testSpeed: 60,
      schedule: { kind: 'SEKARANG', alignToClock: true, count: 48 },
    });
    expect(await startSession(test)).toBeNull();
    for (let i = 1; i <= 48; i++) {
      vi.setSystemTime(at(6) + i * 15_000); // 15 detik nyata = 15 menit virtual
      await recordTap('s1', 'A', null, 'SM', 'TAP', clock.now() - 1_000);
      const r = await advance('s1', clock.now());
      expect(r.closed.map((x) => x.index)).toEqual([i]);
    }
    const all = await db.intervals.toArray();
    expect(all.every((x) => x.status === 'LENGKAP' && x.counts['A|-|SM'] === 1)).toBe(true);
    expect((await db.sessions.get('s1'))?.status).toBe('SELESAI');
  });

  it('MANUAL: tunggu kelipatan jam, buka otomatis, simpan lalu berhenti', async () => {
    vi.setSystemTime(at(7, 13));
    await startSession(
      draft({ timerMode: 'MANUAL', manual: { snapToClock: true, maxIntervals: 2 } }),
    );
    expect(await db.sessions.get('s1')).toMatchObject({
      status: 'MENUNGGU',
      pendingStart: at(7, 15),
    });
    vi.setSystemTime(at(7, 15));
    expect((await advance('s1', clock.now())).opened).toBe(true);
    vi.setSystemTime(at(7, 30));
    expect((await advance('s1', clock.now())).closed[0]).toMatchObject({
      index: 1,
      status: 'LENGKAP',
    });
    expect((await db.sessions.get('s1'))?.status).toBe('MENUNGGU');
    vi.setSystemTime(at(7, 40));
    await requestManualStart('s1', clock.now());
    vi.setSystemTime(at(7, 45));
    const r = await advance('s1', clock.now());
    expect(r.opened && r.closed).toEqual([]);
    vi.setSystemTime(at(8));
    expect((await advance('s1', clock.now())).phase).toBe('SELESAI');
  });

  it('hanya satu sesi aktif sekaligus', async () => {
    vi.setSystemTime(at(7));
    await startSession(draft());
    expect(await startSession(draft({ id: 's2' }))).not.toBeNull();
  });
});
