export type SchemeId = 'PKJI2023' | 'PKJI2023_KOTA' | 'BM8' | 'SEDERHANA' | 'KUSTOM';
export type PkjiClass = 'SM' | 'MP' | 'KS' | 'BB' | 'TB' | 'KTB';
export type Movement = 'LT' | 'ST' | 'RT' | 'UT';
export type SurveyType = 'RUAS' | 'SIMPANG';

export interface VehicleType {
  code: string; // 'SM', 'MP', 'G5a' — unik, 1–5 karakter
  name: string;
  description?: string;
  color: string; // hex, untuk tombol
  ekr: number | null; // null = belum diisi
  inSkr: boolean; // false untuk KTB / kendaraan yang tidak dikonversi
  pkji?: PkjiClass; // padanan ke kelas PKJI (opsional)
  order: number;
}

export interface ClassificationTemplate {
  id: string;
  name: string;
  scheme: SchemeId;
  builtIn: boolean;
  vehicleTypes: VehicleType[];
  updatedAt: number;
}

export interface Position {
  key: string; // arah: 'A', 'B' · lengan: 'U', 'T', 'S', 'BR'
  label: string;
  movements: Movement[] | null; // null untuk RUAS
}

export interface TimeBlock {
  label: string;
  start: string; // 'HH:mm'
  end: string;
}

export type Schedule =
  | { kind: 'SEKARANG'; alignToClock: boolean; count?: number; until?: string }
  | { kind: 'BLOK'; blocks: TimeBlock[] };

export type SessionStatus = 'DRAFT' | 'MENUNGGU' | 'BERJALAN' | 'SELESAI';

/** Jangkar jam dipercepat (Mode uji): virtual = virtual0 + (real − real0) × speed. */
export interface ClockAnchor {
  real: number;
  virtual: number;
  speed: number;
}

export interface Gap {
  from: number;
  to: number;
}

export interface Session {
  id: string;
  project: string;
  location: string;
  surveyor: string;
  date: string; // YYYY-MM-DD (tanggal mulai)
  roadInfo?: string;
  weather?: string;
  remarks?: string;
  surveyType: SurveyType;
  positions: Position[]; // semua arah/lengan di lokasi
  countedKeys: string[]; // yang dihitung di HP ini (RUAS: 1–2, SIMPANG: 1)
  classification: ClassificationTemplate; // SNAPSHOT saat sesi dibuat (ekr tetap boleh diubah)
  intervalMin: number;
  timerMode: 'MENERUS' | 'MANUAL';
  schedule: Schedule; // khusus MENERUS
  manual?: { maxIntervals?: number; snapToClock: boolean }; // khusus MANUAL
  status: SessionStatus;
  startedAt?: number;
  endedAt?: number;
  lastAliveAt?: number; // heartbeat
  gaps: Gap[]; // periode app tidak aktif
  exportedAt?: number;
  testMode: boolean;
  testSpeed?: number; // ×10 / ×60, hanya bila testMode
  testClock?: ClockAnchor; // diisi saat sesi mode uji dimulai
  pendingStart?: number; // MANUAL: jam mulai interval berikutnya (menunggu kelipatan)
  createdAt: number;
}

export interface CountEvent {
  seq?: number; // auto-increment Dexie
  id: string;
  sessionId: string;
  t: number; // clock.now(), epoch ms
  positionKey: string;
  movement: Movement | null;
  vehicleCode: string;
  delta: 1 | -1;
  kind: 'TAP' | 'UNDO' | 'KOREKSI';
  undoOf?: string;
}

export type IntervalStatus = 'TERBUKA' | 'LENGKAP' | 'PARSIAL' | 'TERPUTUS' | 'TERLEWAT';

export interface IntervalRecord {
  sessionId: string;
  index: number; // mulai dari 1
  start: number; // jadwal
  end: number;
  actualStart: number; // yang benar-benar teramati
  actualEnd: number;
  blockLabel?: string;
  status: IntervalStatus;
  gapMs: number;
  counts: Record<string, number>; // key `${positionKey}|${movement ?? '-'}|${vehicleCode}`
  savedAt?: number;
}

export type NoteCategory =
  | 'HUJAN_RINGAN'
  | 'HUJAN_DERAS'
  | 'KECELAKAAN'
  | 'MACET'
  | 'APILL_MATI'
  | 'DIATUR_PETUGAS'
  | 'ACARA'
  | 'LAINNYA';

export interface NoteEvent {
  id: string;
  sessionId: string;
  t: number;
  category: NoteCategory;
  text?: string;
}

export interface PeakPeriod {
  label: string;
  start: string; // 'HH:mm'
  end: string;
}

export type ButtonSize = 'NORMAL' | 'BESAR' | 'SANGAT_BESAR';

export interface AppSettings {
  buttonSize: ButtonSize;
  lockLandscape: boolean; // layar penuh + kunci landscape saat menghitung (Android)
  vibration: boolean;
  sound: boolean;
  theme: 'TERANG' | 'GELAP';
  peakPeriods: PeakPeriod[];
  defaultIntervalMin: number;
  defaultTemplateId: string;
  testMode: boolean;
  testSpeed: 10 | 60;
}
