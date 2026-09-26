import { useMemo } from 'react';
import { useSettings } from './useSettings';

// Bunyi pendek lewat Web Audio. Harus di-unlock oleh gesture pengguna (tombol Mulai / ketukan).
let ctx: AudioContext | null = null;

export function unlockAudio(): void {
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx ??= new AC();
  if (ctx.state === 'suspended') void ctx.resume();
}

function tone(freq: number, delay: number, dur: number, gain: number) {
  if (!ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sounds = {
  click: () => tone(2000, 0, 0.025, 0.08),
  double: () => {
    tone(1320, 0, 0.12, 0.2);
    tone(1320, 0.2, 0.12, 0.2);
  },
};

/** Bunyi yang menghormati pengaturan Suara. */
export function useBeep() {
  const { sound } = useSettings();
  return useMemo(
    () => ({
      click: () => sound && sounds.click(),
      double: () => sound && sounds.double(),
    }),
    [sound],
  );
}
