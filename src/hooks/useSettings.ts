import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { DEFAULT_TEMPLATE_ID } from '../lib/presets';
import type { AppSettings } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  buttonSize: 'NORMAL',
  vibration: true,
  sound: true,
  theme: 'TERANG',
  // Batas default periode jam puncak (perlu diverifikasi pemilik proyek, BRIEF §15).
  peakPeriods: [
    { label: 'Pagi', start: '05:00', end: '10:00' },
    { label: 'Siang', start: '10:00', end: '15:00' },
    { label: 'Sore', start: '15:00', end: '19:00' },
    { label: 'Malam', start: '19:00', end: '05:00' },
  ],
  defaultIntervalMin: 15,
  defaultTemplateId: DEFAULT_TEMPLATE_ID,
  testMode: false,
  testSpeed: 60,
};

export async function loadSettings(): Promise<AppSettings> {
  const row = await db.settings.get('app');
  return { ...DEFAULT_SETTINGS, ...(row?.value as Partial<AppSettings> | undefined) };
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const current = await loadSettings();
    await db.settings.put({ key: 'app', value: { ...current, ...patch } });
  });
}

/** Pengaturan app (default selama belum dimuat). */
export function useSettings(): AppSettings {
  return useLiveQuery(loadSettings) ?? DEFAULT_SETTINGS;
}
