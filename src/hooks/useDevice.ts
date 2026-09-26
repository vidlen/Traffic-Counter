import { useEffect, useState, useSyncExternalStore } from 'react';

// Orientasi, layar penuh + kunci landscape (Android), dan baterai untuk layar hitung.

const portraitQuery = () => matchMedia('(orientation: portrait)');

export function usePortrait(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = portraitQuery();
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => portraitQuery().matches,
  );
}

type LockableOrientation = ScreenOrientation & {
  lock?: (o: 'landscape') => Promise<void>;
  unlock?: () => void;
};

export const canLockLandscape =
  typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;

/**
 * Layar penuh lalu kunci landscape. Harus dipanggil dari gesture pengguna (ketukan).
 * iPhone tidak mendukung keduanya: pengguna memutar HP sendiri.
 */
export async function enterLandscape(): Promise<void> {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
    await (screen.orientation as LockableOrientation).lock?.('landscape');
  } catch {
    // Tidak didukung / ditolak: tata letak tetap mengikuti orientasi HP.
  }
}

export function exitLandscape(): void {
  try {
    (screen.orientation as LockableOrientation).unlock?.();
  } catch {
    // abaikan
  }
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
}

interface BatteryManager extends EventTarget {
  level: number;
  charging: boolean;
}

/** Persen baterai (Chrome Android); null bila browser tidak memberi informasi (mis. iPhone). */
export function useBattery(): number | null {
  const [level, setLevel] = useState<number | null>(null);
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> };
    if (!nav.getBattery) return;
    let battery: BatteryManager | undefined;
    const update = () => battery && setLevel(Math.round(battery.level * 100));
    void nav.getBattery().then((b) => {
      battery = b;
      update();
      b.addEventListener('levelchange', update);
    });
    return () => battery?.removeEventListener('levelchange', update);
  }, []);
  return level;
}
