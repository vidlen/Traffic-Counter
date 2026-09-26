import { useEffect } from 'react';

export const wakeLockSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

/** Layar tetap menyala selama `enabled`; diminta ulang saat app kembali terlihat. */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !wakeLockSupported) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        const next = await navigator.wakeLock.request('screen');
        if (cancelled) void next.release();
        else lock = next;
      } catch {
        // Ditolak (mis. mode hemat baterai) — layar mungkin mati sendiri.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };
    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, [enabled]);
}
