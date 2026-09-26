import type { ClockAnchor } from '../types';

// Satu-satunya sumber waktu app. Normal = Date.now().
// Sesi Mode uji memasang jangkar sehingga waktu berjalan ×10 / ×60.
let anchor: ClockAnchor | null = null;

export const clock = {
  now(): number {
    const real = Date.now();
    return anchor ? anchor.virtual + (real - anchor.real) * anchor.speed : real;
  },
  speed(): number {
    return anchor?.speed ?? 1;
  },
  /** Jangkar baru untuk sesi Mode uji: waktu virtual mulai dari "sekarang". */
  anchor(speed: number): ClockAnchor {
    return { real: Date.now(), virtual: clock.now(), speed };
  },
  /** Pasang jam dipercepat milik sesi Mode uji; null = kembali ke jam HP. */
  use(next: ClockAnchor | null): void {
    anchor = next;
  },
};
