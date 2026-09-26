import Dexie, { type EntityTable, type Table } from 'dexie';
import type {
  ClassificationTemplate,
  CountEvent,
  IntervalRecord,
  NoteEvent,
  Session,
} from '../types';

export interface SettingRow {
  key: string;
  value: unknown;
}

export class TcDatabase extends Dexie {
  templates!: EntityTable<ClassificationTemplate, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  events!: EntityTable<CountEvent, 'seq'>;
  intervals!: Table<IntervalRecord, [string, number]>;
  notes!: EntityTable<NoteEvent, 'id'>;
  settings!: EntityTable<SettingRow, 'key'>;

  constructor(name = 'tc-counter') {
    super(name);
    this.version(1).stores({
      templates: 'id, scheme, builtIn',
      sessions: 'id, status, createdAt',
      events: '++seq, id, sessionId, [sessionId+t]',
      intervals: '[sessionId+index], sessionId',
      notes: 'id, sessionId, [sessionId+t]',
      settings: 'key',
    });
  }
}

export const db = new TcDatabase();
