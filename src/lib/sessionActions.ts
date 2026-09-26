import { db } from './db';

// Operasi Dexie untuk sesi (efek samping). Logika murni ada di engine.ts / session.ts.

export async function deleteSession(id: string): Promise<void> {
  await db.transaction('rw', [db.sessions, db.events, db.intervals, db.notes], async () => {
    await db.events.where('sessionId').equals(id).delete();
    await db.intervals.where('sessionId').equals(id).delete();
    await db.notes.where('sessionId').equals(id).delete();
    await db.sessions.delete(id);
  });
}
