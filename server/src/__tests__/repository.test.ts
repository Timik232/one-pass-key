import Database from 'better-sqlite3';
import { describe, expect, it, beforeEach } from 'vitest';
import { initSchema } from '../db/schema.js';
import { createRepository } from '../db/repository.js';

describe('repository single_use behavior', () => {
  let db: Database.Database;
  let repo: ReturnType<typeof createRepository>;

  beforeEach(() => {
    db = new Database(':memory:');
    initSchema(db);
    repo = createRepository(db);
  });

  it('deletes secret after first read when single_use = 1', () => {
    const created = repo.create({
      encrypted_data: Buffer.from('secret-1'),
      iv: Buffer.from('iv-1'),
      salt: null,
      has_passphrase: 0,
      single_use: 1,
      ttl_seconds: 3600,
    });

    const firstRead = repo.readAndDelete(created.id);
    const secondRead = repo.readAndDelete(created.id);
    const metaAfterRead = repo.getMeta(created.id);

    expect(firstRead).not.toBeNull();
    expect(firstRead?.single_use).toBe(true);
    expect(secondRead).toBeNull();
    expect(metaAfterRead).toBeNull();
  });

  it('keeps secret available for repeated reads when single_use = 0', () => {
    const created = repo.create({
      encrypted_data: Buffer.from('secret-2'),
      iv: Buffer.from('iv-2'),
      salt: null,
      has_passphrase: 1,
      single_use: 0,
      ttl_seconds: 3600,
    });

    const firstRead = repo.readAndDelete(created.id);
    const secondRead = repo.readAndDelete(created.id);
    const metaAfterReads = repo.getMeta(created.id);

    expect(firstRead).not.toBeNull();
    expect(firstRead?.single_use).toBe(false);
    expect(secondRead).not.toBeNull();
    expect(secondRead?.single_use).toBe(false);
    expect(metaAfterReads).not.toBeNull();
    expect(metaAfterReads?.single_use).toBe(false);
  });

  it('defaults to single-use when client omits the flag', () => {
    const created = repo.create({
      encrypted_data: Buffer.from('secret-3'),
      iv: Buffer.from('iv-3'),
      salt: null,
      has_passphrase: 0,
      single_use: 1,
      ttl_seconds: 3600,
    });

    const firstRead = repo.readAndDelete(created.id);
    const secondRead = repo.readAndDelete(created.id);

    expect(firstRead?.single_use).toBe(true);
    expect(secondRead).toBeNull();
  });
});
