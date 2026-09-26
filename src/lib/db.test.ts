import { describe, expect, it } from 'vitest';
import { TcDatabase } from './db';

describe('db', () => {
  it('membuka skema v1 dengan semua tabel', async () => {
    const d = new TcDatabase('test-schema');
    await d.open();
    expect(d.tables.map((x) => x.name).sort()).toEqual([
      'events',
      'intervals',
      'notes',
      'sessions',
      'settings',
      'templates',
    ]);
    await d.delete();
  });
});
