import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { t } from '../i18n/id';
import { clock } from '../lib/clock';
import { db } from '../lib/db';
import {
  detectGap,
  type EngineState,
  engineState,
  HEARTBEAT_MS,
  type Phase,
  sumCounts,
} from '../lib/engine';
import { fmtNum } from '../lib/format';
import { countKey, flowsOf, isActive } from '../lib/session';
import {
  type AdvanceResult,
  addNote,
  advance,
  finishSession,
  heartbeat,
  newEvent,
  recordGap,
  requestManualStart,
  scheduleOf,
  startNowUnaligned,
  undoLast,
} from '../lib/sessionActions';
import { fmtRange, fmtTime } from '../lib/time';
import { toast, useEngine, useUi } from '../store';
import type { CountEvent, Gap, IntervalRecord, NoteCategory, Session } from '../types';
import { unlockAudio, useBeep } from './useBeep';
import { useHaptics } from './useHaptics';

const tc = t.counter;
const total = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);

/**
 * Mesin interval untuk sesi aktif, dipasang sekali di App (jalan di semua halaman):
 * heartbeat, deteksi celah, tutup interval otomatis, catch-up, bunyi/getar/toast.
 * Hanya bekerja saat app terlihat; saat kembali terlihat, celah dicatat dulu lalu catch-up.
 */
export function useSessionEngine(): void {
  const active = useLiveQuery(() =>
    db.sessions.where('status').anyOf('BERJALAN', 'MENUNGGU').first(),
  );
  const id = active?.id;
  const records = useLiveQuery(
    () => (id ? db.intervals.where('sessionId').equals(id).toArray() : []),
    [id],
  );
  const haptics = useHaptics();
  const beep = useBeep();
  const sRef = useRef<Session | undefined>(undefined);
  const rRef = useRef<IntervalRecord[]>([]);
  const fx = useRef({ haptics, beep });
  useEffect(() => {
    sRef.current = active;
    rRef.current = records ?? [];
    fx.current = { haptics, beep };
    clock.use(active?.testClock ?? null); // jam Mode uji mengikuti sesi aktif
  });

  useEffect(() => {
    if (!id) {
      useEngine.setState({ tick: null });
      return;
    }
    let lastSeen = sRef.current?.lastAliveAt ?? clock.now();
    let lastBeat = -Infinity;
    let prevPhase: Phase | undefined;
    let busy = false;

    const notify = (r: AdvanceResult, gap: Gap | null, before: EngineState, s: Session) => {
      const { haptics, beep } = fx.current;
      if (gap) {
        const lines = [tc.gapNotice(fmtTime(gap.from), fmtTime(gap.to))];
        for (const c of r.closed) {
          if (c.status === 'TERPUTUS' || c.status === 'TERLEWAT') {
            lines.push(tc.gapInterval(fmtRange(c.start, c.end, s.date), c.status));
          }
        }
        const cur = before.current;
        if (cur && cur.start < gap.to)
          lines.push(tc.gapCurrent(fmtRange(cur.start, cur.end, s.date)));
        // Celah yang seluruhnya jatuh di jeda antar-blok tidak memengaruhi data: tidak perlu diberitahukan.
        if (lines.length > 1) useUi.getState().setNotice(lines.join(' '));
      } else {
        const last = r.closed.at(-1);
        if (last) {
          beep.double();
          haptics.intervalEnd();
          toast(
            tc.intervalSaved(fmtRange(last.start, last.end, s.date), fmtNum(total(last.counts))),
          );
        }
      }
      if (r.phase === 'SELESAI') toast(tc.sessionDone);
    };

    const step = async () => {
      if (busy || document.visibilityState !== 'visible') return;
      const s = sRef.current;
      if (!s || s.id !== id || !isActive(s)) return;
      busy = true;
      try {
        const now = clock.now();
        const speed = clock.speed();
        const gap = detectGap(Math.max(lastSeen, s.lastAliveAt ?? -Infinity), now, speed);
        lastSeen = now;
        if (gap) await recordGap(id, gap);
        else if (now - lastBeat >= HEARTBEAT_MS * speed) {
          lastBeat = now;
          await heartbeat(id, now);
        }
        const st = engineState(s, scheduleOf(s), rRef.current, now);
        if (prevPhase === 'MENUNGGU' && st.phase === 'BERJALAN') {
          fx.current.beep.double();
          fx.current.haptics.intervalEnd();
          toast(tc.started);
        }
        prevPhase = st.phase;
        useEngine.setState({ tick: { sessionId: id, state: st, now } });
        if (gap || st.due.length || st.startManualAt !== undefined || st.phase !== s.status) {
          notify(await advance(id, now), gap, st, s);
        }
      } finally {
        busy = false;
      }
    };

    const timer = setInterval(() => void step(), 250);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void heartbeat(id, clock.now());
      else void step();
    };
    document.addEventListener('visibilitychange', onVisibility);
    void step();
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [id]);
}

/** Data & aksi layar hitung untuk satu sesi. */
export function useCounterSession(id: string) {
  const session = useLiveQuery(() => db.sessions.get(id).then((x) => x ?? null), [id]);
  const records = useLiveQuery(() => db.intervals.where('sessionId').equals(id).toArray(), [id]);
  const eng = useEngine(
    useShallow((x) => {
      const st = x.tick?.sessionId === id ? x.tick.state : undefined;
      return {
        phase: st?.phase,
        index: st?.current?.index,
        start: st?.current?.start,
        end: st?.current?.end,
        blockLabel: st?.current?.blockLabel,
        total: st?.total,
        nextStart: st?.nextStart,
        nextBlock: st?.nextBlock,
      };
    }),
  );
  const curStart = eng.phase === 'BERJALAN' ? eng.start : undefined;
  const dbEvents = useLiveQuery(
    () =>
      curStart === undefined
        ? []
        : db.events.where('[sessionId+t]').between([id, curStart], [id, Infinity]).toArray(),
    [id, curStart],
  );
  const [pending, setPending] = useState<CountEvent[]>([]);
  const [correction, setCorrectionState] = useState(false);
  const haptics = useHaptics();

  const flows = useMemo(() => (session ? flowsOf(session) : []), [session]);
  const events = useMemo(() => {
    const confirmed = dbEvents ?? [];
    const ids = new Set(confirmed.map((e) => e.id));
    const extra = pending.filter(
      (p) => !ids.has(p.id) && curStart !== undefined && p.t >= curStart,
    );
    return [...confirmed, ...extra].sort((a, b) => a.t - b.t);
  }, [dbEvents, pending, curStart]);
  const counts = useMemo(() => sumCounts(events), [events]);
  const closedTotals = useMemo(() => {
    const out: Record<string, number> = {};
    for (const r of records ?? []) {
      if (r.status === 'TERBUKA') continue;
      for (const [k, n] of Object.entries(r.counts)) out[k] = (out[k] ?? 0) + n;
    }
    return out;
  }, [records]);

  // Ref untuk callback stabil (tombol di-memo supaya ketukan cepat tidak me-render semua tombol).
  const live = useRef({ session, records, counts, correction, dbIds: new Set<string>(), flows });
  useEffect(() => {
    live.current = {
      session,
      records,
      counts,
      correction,
      dbIds: new Set((dbEvents ?? []).map((e) => e.id)),
      flows,
    };
  });
  // Tulisan event yang belum selesai (undo menunggu semuanya supaya membaca data terbaru).
  const writes = useRef(new Set<Promise<unknown>>());
  const correctionTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const setCorrection = useCallback((on: boolean) => {
    clearTimeout(correctionTimer.current);
    setCorrectionState(on);
    if (on) correctionTimer.current = setTimeout(() => setCorrectionState(false), 5000);
  }, []);
  useEffect(() => () => clearTimeout(correctionTimer.current), []);

  const tap = useCallback(
    (flowKey: string, code: string) => {
      const {
        session: s,
        records: recs,
        counts: c,
        correction: kor,
        dbIds,
        flows: fl,
      } = live.current;
      const flow = fl.find((f) => f.key === flowKey);
      if (!s || !flow || !isActive(s)) return;
      const now = clock.now();
      if (!engineState(s, scheduleOf(s), recs ?? [], now).current) return;
      unlockAudio();
      const kind = kor ? 'KOREKSI' : 'TAP';
      if (kind === 'KOREKSI') {
        if ((c[countKey(flow.positionKey, flow.movement, code)] ?? 0) <= 0) return haptics.refuse();
        setCorrection(true); // perpanjang 5 detik
      }
      const e = newEvent(s.id, flow.positionKey, flow.movement, code, kind, now);
      setPending((p) => [...p.filter((x) => !dbIds.has(x.id)), e]);
      // Langsung ditulis (tanpa antre): IndexedDB menjalankan transaksi sesuai urutan dibuat.
      const write = db.events.add(e).catch(() => {
        toast(tc.saveFailed, 'danger');
        setPending((p) => p.filter((x) => x.id !== e.id));
      });
      writes.current.add(write);
      void write.finally(() => writes.current.delete(write));
      haptics.tap();
    },
    [haptics, setCorrection],
  );

  const undo = useCallback(async () => {
    const { session: s, records: recs, flows: fl } = live.current;
    if (!s) return;
    const cur = engineState(s, scheduleOf(s), recs ?? [], clock.now()).current;
    if (!cur) return;
    await Promise.all(writes.current);
    const target = await undoLast(s.id, cur.start, clock.now());
    if (!target) return toast(tc.nothingToUndo);
    const flow = fl.find(
      (f) => f.positionKey === target.positionKey && f.movement === target.movement,
    );
    toast(tc.undone(`${target.vehicleCode} ${flow?.label ?? ''}`.trim()));
    haptics.tap();
  }, [haptics]);

  const note = useCallback(
    async (category: NoteCategory, text?: string) => {
      await addNote(id, category, text, clock.now());
      toast(t.notes.saved(category === 'LAINNYA' && text ? text : t.notes.categories[category]));
    },
    [id],
  );

  return {
    session,
    records,
    flows,
    eng,
    counts,
    sessionTotal: (key: string) => (closedTotals[key] ?? 0) + (counts[key] ?? 0),
    intervalTotal: total(counts),
    correction,
    setCorrection,
    tap,
    undo,
    note,
    startNext: () => requestManualStart(id, clock.now()),
    startNow: () => startNowUnaligned(id, clock.now()),
    finish: () => finishSession(id, clock.now()),
  };
}
