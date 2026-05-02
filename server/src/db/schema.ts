import type Database from 'better-sqlite3';

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS secrets (
      id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      encrypted_data  BLOB NOT NULL,
      iv              BLOB NOT NULL,
      salt            BLOB,
      has_passphrase  INTEGER NOT NULL DEFAULT 0,
      single_use      INTEGER NOT NULL DEFAULT 1,
      ttl_seconds     INTEGER NOT NULL DEFAULT 86400,
      expires_at      TEXT NOT NULL,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      is_read         INTEGER NOT NULL DEFAULT 0
    );
  `);

  const columns = db
    .prepare("PRAGMA table_info('secrets')")
    .all() as Array<{ name: string }>;

  const hasSingleUseColumn = columns.some((column) => column.name === 'single_use');
  if (!hasSingleUseColumn) {
    db.exec(`ALTER TABLE secrets ADD COLUMN single_use INTEGER NOT NULL DEFAULT 1;`);
  }
}
