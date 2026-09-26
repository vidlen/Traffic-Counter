import { useEffect } from 'react';

/** Peringatan browser saat menutup/memuat ulang tab ketika sesi aktif. */
export function useBeforeUnload(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [active]);
}
