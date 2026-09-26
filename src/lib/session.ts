import { t } from '../i18n/id';
import type { AppSettings, ClassificationTemplate, Movement, Position, Session } from '../types';

export const MOVEMENTS: Movement[] = ['LT', 'ST', 'RT', 'UT'];
export const ARMS = ['U', 'T', 'S', 'BR'] as const;
export type ArmKey = (typeof ARMS)[number];

/** Aliran = satu set tombol: RUAS satu arah, SIMPANG satu gerakan di lengan yang dihitung. */
export interface Flow {
  key: string; // `${positionKey}|${movement ?? '-'}`
  positionKey: string;
  movement: Movement | null;
  label: string;
}

/** Warna garis grafik per aliran (urutan tetap); Total memakai warna tinta. */
export const FLOW_COLORS = ['#1d4ed8', '#c2410c', '#15803d', '#6d28d9'];

export const countKey = (positionKey: string, movement: Movement | null, code: string) =>
  `${positionKey}|${movement ?? '-'}|${code}`;

export function flowsOf(s: Pick<Session, 'surveyType' | 'positions' | 'countedKeys'>): Flow[] {
  const counted = s.positions.filter((p) => s.countedKeys.includes(p.key));
  if (s.surveyType === 'RUAS') {
    return counted.map((p) => ({
      key: `${p.key}|-`,
      positionKey: p.key,
      movement: null,
      label: p.label,
    }));
  }
  const arm = counted[0];
  if (!arm) return [];
  return MOVEMENTS.filter((m) => arm.movements?.includes(m)).map((m) => ({
    key: `${arm.key}|${m}`,
    positionKey: arm.key,
    movement: m,
    label: m,
  }));
}

export function ruasPositions(n: 1 | 2, prev: Position[] = []): Position[] {
  return ['A', 'B'].slice(0, n).map((key) => ({
    key,
    label: prev.find((p) => p.key === key)?.label ?? t.wizard.arahLabel(key),
    movements: null,
  }));
}

export function simpangPositions(arms: 3 | 4, missing: ArmKey, prev: Position[] = []): Position[] {
  return ARMS.filter((k) => arms === 4 || k !== missing).map((key) => {
    const old = prev.find((p) => p.key === key);
    return {
      key,
      label: old?.label ?? t.wizard.armLabel[key],
      movements: old?.movements ?? ['LT', 'ST', 'RT'],
    };
  });
}

export function newSession(
  template: ClassificationTemplate,
  settings: AppSettings,
  id: string,
  now: number,
  date: string,
): Session {
  return {
    id,
    project: '',
    location: '',
    surveyor: '',
    date,
    roadInfo: '',
    weather: '',
    remarks: '',
    surveyType: 'RUAS',
    positions: ruasPositions(2),
    countedKeys: ['A', 'B'],
    classification: structuredClone(template),
    intervalMin: settings.defaultIntervalMin,
    timerMode: 'MENERUS',
    schedule: { kind: 'SEKARANG', alignToClock: true, count: 4 },
    manual: { snapToClock: true },
    status: 'DRAFT',
    gaps: [],
    testMode: settings.testMode,
    testSpeed: settings.testMode ? settings.testSpeed : undefined,
    createdAt: now,
  };
}

/** "Duplikat pengaturan (tanpa data)": sesi DRAFT baru dengan pengaturan yang sama. */
export function duplicateSettings(
  src: Session,
  settings: AppSettings,
  id: string,
  now: number,
  date: string,
): Session {
  const copy = structuredClone(src);
  for (const k of [
    'startedAt',
    'endedAt',
    'lastAliveAt',
    'exportedAt',
    'testClock',
    'pendingStart',
  ] as const) {
    delete copy[k];
  }
  return {
    ...copy,
    id,
    date,
    status: 'DRAFT',
    gaps: [],
    testMode: settings.testMode,
    testSpeed: settings.testMode ? settings.testSpeed : undefined,
    createdAt: now,
  };
}

/** Semua jenis yang masuk skr sudah punya ekr? */
export const ekrComplete = (s: Pick<Session, 'classification'>) =>
  s.classification.vehicleTypes.every((v) => !v.inSkr || v.ekr !== null);

export const isActive = (s: Pick<Session, 'status'>) =>
  s.status === 'BERJALAN' || s.status === 'MENUNGGU';
