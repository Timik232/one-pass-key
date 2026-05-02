import { describe, expect, it, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { Hono } from 'hono';
import { initSchema } from '../db/schema.js';
import { createRepository } from '../db/repository.js';
import { createSecretsRouter } from '../routes/secrets.js';

function createApp() {
  const db = new Database(':memory:');
  initSchema(db);
  const repo = createRepository(db);
  const app = new Hono();
  app.route('/api/secrets', createSecretsRouter(repo));
  return app;
}

const payloadBase = {
  encrypted_data: Buffer.from('enc').toString('base64url'),
  iv: Buffer.from('iv').toString('base64url'),
  has_passphrase: false,
  ttl_seconds: 3600,
};

describe('secrets routes single_use', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  it('enforces one-time read by default', async () => {
    const createRes = await app.request('/api/secrets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadBase),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string };

    const firstRead = await app.request(`/api/secrets/${created.id}`);
    const secondRead = await app.request(`/api/secrets/${created.id}`);

    expect(firstRead.status).toBe(200);
    expect(secondRead.status).toBe(404);
  });

  it('allows repeated reads when single_use is false', async () => {
    const createRes = await app.request('/api/secrets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payloadBase, single_use: false }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string };

    const firstRead = await app.request(`/api/secrets/${created.id}`);
    const firstBody = (await firstRead.json()) as { single_use: boolean };

    const secondRead = await app.request(`/api/secrets/${created.id}`);
    const secondBody = (await secondRead.json()) as { single_use: boolean };

    const metaRes = await app.request(`/api/secrets/${created.id}/meta`);
    const meta = (await metaRes.json()) as { single_use: boolean };

    expect(firstRead.status).toBe(200);
    expect(firstBody.single_use).toBe(false);
    expect(secondRead.status).toBe(200);
    expect(secondBody.single_use).toBe(false);
    expect(metaRes.status).toBe(200);
    expect(meta.single_use).toBe(false);
  });

  it('rejects invalid single_use value', async () => {
    const createRes = await app.request('/api/secrets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payloadBase, single_use: 'nope' }),
    });

    expect(createRes.status).toBe(400);
    expect(await createRes.json()).toEqual({ error: 'single_use must be a boolean' });
  });
});
