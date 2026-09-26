import { closeInterval } from '../lib/engine';
import { PRESETS } from '../lib/presets';
import { buildSchedule } from '../lib/schedule';
import { flowsOf } from '../lib/session';
import type { CountEvent, IntervalRecord, NoteEvent, Session } from '../types';

// Data survei contoh yang deterministik untuk tes rekap/Excel (dan demo di browser).

const at = (h: number, m = 0, d = 5) => new Date(2026, 0, d, h, m).getTime();

/** PRNG sederhana (mulberry32) supaya data selalu sama. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const EKR: Record<string, number | null> = {
  SM: 0.25,
  MP: 1,
  KS: 1.2,
  BB: 1.3,
  TB: 1.8,
  KTB: null,
};
// Rata-rata kendaraan per 15 menit per arah.
const BASE: Record<string, number> = { SM: 120, MP: 45, KS: 8, BB: 3, TB: 4, KTB: 2 };

export interface Demo {
  session: Session;
  intervals: IntervalRecord[];
  notes: NoteEvent[];
  events: CountEvent[];
}

export function demoData(opts: { simpang?: boolean; ekrComplete?: boolean } = {}): Demo {
  const tpl = structuredClone(PRESETS[0]);
  tpl.vehicleTypes = tpl.vehicleTypes.map((v) => ({
    ...v,
    ekr: opts.ekrComplete === false && v.code === 'KS' ? null : EKR[v.code],
  }));
  const session: Session = {
    id: 'demo',
    project: 'Kajian Lalu Lintas Koridor Kaliurang',
    location: 'Jl. Kaliurang km 5',
    surveyor: 'Rara Wulandari',
    date: '2026-01-05',
    roadInfo: '4/2 T perkotaan',
    weather: 'Cerah',
    remarks: 'Pos di depan halte',
    surveyType: opts.simpang ? 'SIMPANG' : 'RUAS',
    positions: opts.simpang
      ? [
          { key: 'U', label: 'Lengan Utara', movements: ['LT', 'ST', 'RT'] },
          { key: 'T', label: 'Lengan Timur', movements: ['LT', 'ST', 'RT'] },
          { key: 'S', label: 'Lengan Selatan', movements: ['LT', 'ST', 'RT'] },
        ]
      : [
          { key: 'A', label: 'Arah Tugu', movements: null },
          { key: 'B', label: 'Arah Kaliurang', movements: null },
        ],
    countedKeys: opts.simpang ? ['U'] : ['A', 'B'],
    classification: tpl,
    intervalMin: 15,
    timerMode: 'MENERUS',
    schedule: {
      kind: 'BLOK',
      blocks: [
        { label: 'Pagi', start: '06:00', end: '09:00' },
        { label: 'Sore', start: '15:00', end: '17:00' },
      ],
    },
    status: 'SELESAI',
    startedAt: at(6, 5), // terlambat 5 menit → interval pertama PARSIAL
    endedAt: at(17),
    gaps: [
      { from: at(7, 40), to: at(7, 44) }, // → interval 07.30-07.45 TERPUTUS
      { from: at(8, 14), to: at(8, 31) }, // → interval 08.15-08.30 TERLEWAT
    ],
    testMode: false,
    createdAt: at(5, 50),
  };

  const rand = rng(42);
  const schedule = buildSchedule(session, session.startedAt!);
  const flows = flowsOf(session);
  const events: CountEvent[] = [];
  let seq = 0;
  const push = (e: Omit<CountEvent, 'seq' | 'id' | 'sessionId'>) =>
    events.push({ ...e, seq: ++seq, id: `e${seq}`, sessionId: session.id });

  for (const iv of schedule) {
    const hour = new Date(iv.start).getHours();
    const peak = hour === 7 || hour === 16 ? 1.6 : 1;
    const from = Math.max(iv.start, session.startedAt!);
    for (const f of flows) {
      for (const v of tpl.vehicleTypes) {
        const n = Math.round(
          BASE[v.code] * peak * (0.7 + rand() * 0.6) * (f.movement === 'ST' ? 1.5 : 1),
        );
        for (let k = 0; k < n; k++) {
          const t = from + Math.floor(rand() * (iv.end - from));
          const inGap = session.gaps.some((g) => t >= g.from && t < g.to);
          if (!inGap) {
            push({
              t,
              positionKey: f.positionKey,
              movement: f.movement,
              vehicleCode: v.code,
              delta: 1,
              kind: 'TAP',
            });
          }
        }
      }
    }
  }
  events.sort((a, b) => a.t - b.t);
  // Satu undo dan satu koreksi di interval pertama.
  const first = events.find((e) => e.vehicleCode === 'MP')!;
  push({ ...first, t: first.t + 500, delta: -1, kind: 'UNDO', undoOf: first.id });
  const sm = events.find((e) => e.vehicleCode === 'SM')!;
  push({ ...sm, t: sm.t + 700, delta: -1, kind: 'KOREKSI' });
  events.sort((a, b) => a.t - b.t || (a.seq ?? 0) - (b.seq ?? 0));

  const intervals = schedule.map((iv) => closeInterval(session, iv, events, iv.end + 1));
  const notes: NoteEvent[] = [
    { id: 'n1', sessionId: session.id, t: at(6, 50), category: 'HUJAN_RINGAN' },
    {
      id: 'n2',
      sessionId: session.id,
      t: at(16, 20),
      category: 'LAINNYA',
      text: 'Truk mogok di lajur kiri',
    },
  ];
  return { session, intervals, notes, events };
}
