import { describe, expect, it } from 'vitest';
import { t } from '../i18n/id';
import type { Session } from '../types';
import { alignUp, buildSchedule, previewSchedule, validateTiming } from './schedule';
import { fmtRange, MIN, toExcelSerial } from './time';

type Timing = Pick<Session, 'intervalMin' | 'timerMode' | 'schedule' | 'date' | 'manual'>;

const at = (d: number, h: number, m = 0, s = 0) => new Date(2026, 0, d, h, m, s).getTime();
const base = (over: Partial<Timing>): Timing => ({
  intervalMin: 15,
  timerMode: 'MENERUS',
  date: '2026-01-05',
  schedule: { kind: 'SEKARANG', alignToClock: false, count: 4 },
  ...over,
});
const blocks = (...b: [string, string, string][]) => ({
  kind: 'BLOK' as const,
  blocks: b.map(([label, start, end]) => ({ label, start, end })),
});

describe('buildSchedule', () => {
  it('15 menit mulai 06.00 selama 12 jam → 48 interval dengan batas tepat', () => {
    const byCount = buildSchedule(
      base({ schedule: { kind: 'SEKARANG', alignToClock: true, count: 48 } }),
      at(5, 6),
    );
    const byUntil = buildSchedule(
      base({ schedule: { kind: 'SEKARANG', alignToClock: true, until: '18:00' } }),
      at(5, 6),
    );
    const byBlock = buildSchedule(base({ schedule: blocks(['Hari', '06:00', '18:00']) }), 0);
    for (const list of [byCount, byUntil, byBlock]) {
      expect(list).toHaveLength(48);
      expect(list[0].start).toBe(at(5, 6));
      expect(list[47].end).toBe(at(5, 18));
      list.forEach((iv, i) => {
        expect(iv.index).toBe(i + 1);
        expect(iv.end - iv.start).toBe(15 * MIN);
        if (i) expect(iv.start).toBe(list[i - 1].end);
      });
    }
  });

  it('alignToClock: mulai 07.13.20 → interval pertama 07.15.00', () => {
    expect(alignUp(at(5, 7, 13, 20), 15)).toBe(at(5, 7, 15));
    expect(alignUp(at(5, 7, 15), 15)).toBe(at(5, 7, 15));
    const list = buildSchedule(
      base({ schedule: { kind: 'SEKARANG', alignToClock: true, count: 2 } }),
      at(5, 7, 13, 20),
    );
    expect(list.map((x) => x.start)).toEqual([at(5, 7, 15), at(5, 7, 30)]);
    const unaligned = buildSchedule(base({}), at(5, 7, 13, 20));
    expect(unaligned[0].start).toBe(at(5, 7, 13, 20));
  });

  it('blok Pagi/Siang/Sore → jumlah benar dan tidak ada interval di antara blok', () => {
    const list = buildSchedule(
      base({
        schedule: blocks(
          ['Pagi', '06:00', '09:00'],
          ['Siang', '11:00', '13:00'],
          ['Sore', '15:00', '18:00'],
        ),
      }),
      0,
    );
    expect(list).toHaveLength(12 + 8 + 12);
    expect(list.filter((x) => x.blockLabel === 'Siang')).toHaveLength(8);
    const between = list.filter(
      (x) =>
        (x.start >= at(5, 9) && x.start < at(5, 11)) ||
        (x.start >= at(5, 13) && x.start < at(5, 15)),
    );
    expect(between).toEqual([]);
    expect(list[12].start).toBe(at(5, 11));
    expect(list[12].blockLabel).toBe('Siang');
  });

  it('blok 22.00-02.00 lewat tengah malam → tanggal interval benar', () => {
    const list = buildSchedule(base({ schedule: blocks(['Malam', '22:00', '02:00']) }), 0);
    expect(list).toHaveLength(16);
    expect(list[0].start).toBe(at(5, 22));
    expect(list[8].start).toBe(at(6, 0));
    expect(list[15].end).toBe(at(6, 2));
    expect(fmtRange(list[8].start, list[8].end, '2026-01-05')).toBe('06/01 00.00-00.15');
    expect(fmtRange(list[0].start, list[0].end, '2026-01-05')).toBe('22.00-22.15');
  });

  it('blok berikutnya boleh jatuh esok hari (malam lalu pagi)', () => {
    const list = buildSchedule(
      base({ schedule: blocks(['Malam', '22:00', '02:00'], ['Pagi', '06:00', '07:00']) }),
      0,
    );
    expect(list[16].start).toBe(at(6, 6));
    expect(
      validateTiming(base({ schedule: blocks(['M', '22:00', '02:00'], ['P', '06:00', '07:00']) })),
    ).toEqual([]);
  });

  it('MANUAL tidak punya jadwal tetap', () => {
    expect(buildSchedule(base({ timerMode: 'MANUAL' }), at(5, 7))).toEqual([]);
  });

  it('pratinjau: jumlah, pertama, terakhir, total durasi', () => {
    const p = previewSchedule(buildSchedule(base({}), at(5, 7)));
    expect(p.count).toBe(4);
    expect(p.first?.start).toBe(at(5, 7));
    expect(p.last?.end).toBe(at(5, 8));
    expect(p.countedMs).toBe(60 * MIN);
  });
});

describe('validateTiming', () => {
  const e = t.timing;

  it('menolak interval yang bukan pembagi 60', () => {
    expect(validateTiming(base({ intervalMin: 7 }))).toContain(e.interval);
    expect(validateTiming(base({ intervalMin: 45 }))).toContain(e.interval);
    for (const n of [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60]) {
      expect(validateTiming(base({ intervalMin: n }))).toEqual([]);
    }
  });

  it('menolak blok tumpang tindih', () => {
    expect(
      validateTiming(base({ schedule: blocks(['A', '06:00', '09:00'], ['B', '08:00', '10:00']) })),
    ).toEqual([e.blockOverlap]);
    expect(
      validateTiming(base({ schedule: blocks(['A', '06:00', '09:00'], ['B', '09:00', '10:00']) })),
    ).toEqual([]);
  });

  it('menolak durasi blok yang bukan kelipatan interval', () => {
    expect(validateTiming(base({ schedule: blocks(['A', '06:00', '06:50']) }))).toEqual([
      e.blockMultiple('A'),
    ]);
    expect(validateTiming(base({ schedule: blocks(['A', '06:00', '06:00']) }))).toEqual([
      e.blockZero('A'),
    ]);
  });

  it('menolak jumlah/jam selesai kosong dan maks. manual tidak valid', () => {
    expect(
      validateTiming(base({ schedule: { kind: 'SEKARANG', alignToClock: true, count: 0 } })),
    ).toEqual([e.count]);
    expect(validateTiming(base({ schedule: { kind: 'SEKARANG', alignToClock: true } }))).toEqual([
      e.until,
    ]);
    expect(
      validateTiming(base({ timerMode: 'MANUAL', manual: { snapToClock: true, maxIntervals: 0 } })),
    ).toEqual([e.maxIntervals]);
    expect(validateTiming(base({ timerMode: 'MANUAL', manual: { snapToClock: true } }))).toEqual(
      [],
    );
  });
});

describe('toExcelSerial', () => {
  it('07.15 waktu lokal → pecahan hari 0,302083 (tanpa geser zona)', () => {
    const serial = toExcelSerial(at(5, 7, 15));
    expect(serial - Math.floor(serial)).toBeCloseTo(0.302083, 6);
    expect(Math.floor(serial)).toBe(46027); // 05/01/2026
  });
});
