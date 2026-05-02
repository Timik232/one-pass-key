import type Database from 'better-sqlite3';
import type { SecretResponse, SecretMetaResponse } from '../types.js';

export function createRepository(db: Database.Database) {
  const stmtInsert = db.prepare(`
    INSERT INTO secrets (encrypted_data, iv, salt, has_passphrase, single_use, ttl_seconds, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const stmtSelectForRead = db.prepare(`
    SELECT id, encrypted_data, iv, salt, has_passphrase, single_use
    FROM secrets
    WHERE id = ? AND expires_at > datetime('now')
  `);

  const stmtDelete = db.prepare(`
    DELETE FROM secrets WHERE id = ?
  `);

  const stmtMarkReadAndDelete = db.transaction((id: string) => {
    const row = stmtSelectForRead.get(id) as
      | {
          id: string;
          encrypted_data: Buffer;
          iv: Buffer;
          salt: Buffer | null;
          has_passphrase: number;
          single_use: number;
        }
      | undefined;

    if (!row) return null;

    if (row.single_use === 1) {
      stmtDelete.run(id);
    }

    return {
      id: row.id,
      encrypted_data: row.encrypted_data.toString('base64url'),
      iv: row.iv.toString('base64url'),
      salt: row.salt ? row.salt.toString('base64url') : null,
      has_passphrase: row.has_passphrase === 1,
      single_use: row.single_use === 1,
    } satisfies SecretResponse;
  });

  const stmtGetMeta = db.prepare(`
    SELECT id, has_passphrase, single_use, expires_at
    FROM secrets
    WHERE id = ? AND expires_at > datetime('now')
  `);

  const stmtCleanup = db.prepare(`
    DELETE FROM secrets WHERE expires_at <= datetime('now')
  `);

  return {
    create(data: {
      encrypted_data: Buffer;
      iv: Buffer;
      salt: Buffer | null;
      has_passphrase: number;
      single_use: number;
      ttl_seconds: number;
    }): { id: string; expires_at: string } {
      const expiresAt = new Date(Date.now() + data.ttl_seconds * 1000)
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d{3}Z$/, '');

      const result = stmtInsert.run(
        data.encrypted_data,
        data.iv,
        data.salt,
        data.has_passphrase,
        data.single_use,
        data.ttl_seconds,
        expiresAt,
      );

      const row = db.prepare(
        `SELECT id, expires_at FROM secrets WHERE rowid = ?`,
      ).get(result.lastInsertRowid) as { id: string; expires_at: string };

      return { id: row.id, expires_at: row.expires_at };
    },

    readAndDelete(id: string): SecretResponse | null {
      return stmtMarkReadAndDelete(id);
    },

    getMeta(id: string): SecretMetaResponse | null {
      const row = stmtGetMeta.get(id) as
        | { id: string; has_passphrase: number; single_use: number; expires_at: string }
        | undefined;

      if (!row) return null;

      return {
        id: row.id,
        has_passphrase: row.has_passphrase === 1,
        single_use: row.single_use === 1,
        expires_at: row.expires_at,
      };
    },

    cleanupExpired(): number {
      const result = stmtCleanup.run();
      return result.changes;
    },
  };
}
