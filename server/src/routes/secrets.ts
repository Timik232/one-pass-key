import { Hono } from 'hono';
import type { CreateSecretRequest } from '../types.js';
import type { createRepository } from '../db/repository.js';
import { createPassphraseRateLimiter } from '../middleware/rate-limit.js';

export function createSecretsRouter(
  repo: ReturnType<typeof createRepository>,
) {
  const router = new Hono();
  const passphraseLimiter = createPassphraseRateLimiter();

  // POST / - Create a new secret
  router.post('/', async (c) => {
    const body = await c.req.json<CreateSecretRequest>();

    if (
      !body.encrypted_data ||
      !body.iv ||
      typeof body.has_passphrase !== 'boolean'
    ) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    if (![3600, 86400, 604800].includes(body.ttl_seconds)) {
      return c.json({ error: 'Invalid TTL' }, 400);
    }

    const result = repo.create({
      encrypted_data: Buffer.from(body.encrypted_data, 'base64url'),
      iv: Buffer.from(body.iv, 'base64url'),
      salt: body.salt ? Buffer.from(body.salt, 'base64url') : null,
      has_passphrase: body.has_passphrase ? 1 : 0,
      ttl_seconds: body.ttl_seconds,
    });

    return c.json(result, 201);
  });

  // GET /health - Healthcheck
  router.get('/health', (c) => {
    return c.json({ status: 'ok' });
  });

  // GET /:id/meta - Get metadata (no content)
  router.get('/:id/meta', (c) => {
    const meta = repo.getMeta(c.req.param('id'));
    if (!meta) {
      return c.json({ error: 'Secret not found or already read' }, 404);
    }
    return c.json(meta);
  });

  // GET /:id - Read and DELETE (atomic), with passphrase attempt rate limiting
  router.get('/:id', passphraseLimiter.middleware, (c) => {
    const secret = repo.readAndDelete(c.req.param('id'));
    if (!secret) {
      return c.json({ error: 'Secret not found or already read' }, 404);
    }
    return c.json(secret);
  });

  return router;
}
