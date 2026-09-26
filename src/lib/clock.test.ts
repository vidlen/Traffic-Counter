import { afterEach, describe, expect, it, vi } from 'vitest';
import { clock } from './clock';

describe('clock', () => {
  afterEach(() => {
    clock.use(null);
    vi.useRealTimers();
  });

  it('mengikuti jam HP secara normal', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    expect(clock.now()).toBe(1_000_000);
    expect(clock.speed()).toBe(1);
  });

  it('berjalan ×60 di Mode uji dan kembali normal setelah dilepas', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    clock.use({ real: 10_000, virtual: 500_000, speed: 60 });
    vi.advanceTimersByTime(1_000);
    expect(clock.now()).toBe(560_000);
    expect(clock.speed()).toBe(60);
    clock.use(null);
    expect(clock.now()).toBe(11_000);
  });
});
