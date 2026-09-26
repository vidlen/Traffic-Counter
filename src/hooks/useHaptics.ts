import { useMemo } from 'react';
import { sounds } from './useBeep';
import { useSettings } from './useSettings';

export const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

/** Getar (Android). iOS Safari tidak mendukung vibrate → klik suara pendek bila Suara aktif. */
export function useHaptics() {
  const { vibration, sound } = useSettings();
  return useMemo(
    () => ({
      tap() {
        if (!vibration) return;
        if (canVibrate) navigator.vibrate(15);
        else if (sound) sounds.click();
      },
      intervalEnd() {
        if (vibration && canVibrate) navigator.vibrate([200, 100, 200]);
      },
      refuse() {
        if (vibration && canVibrate) navigator.vibrate([40, 40, 40]);
      },
    }),
    [vibration, sound],
  );
}
