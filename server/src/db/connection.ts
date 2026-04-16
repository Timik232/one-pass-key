import Database from 'better-sqlite3';
import { initSchema } from './schema.js';

export function createDb(dbPath: string): Database.Database {
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');

  initSchema(db);

  return db;
}
