import { Hono } from 'hono';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createDb } from './db/connection.js';
import { createRepository } from './db/repository.js';
import { createSecretsRouter } from './routes/secrets.js';
import { cors } from './middleware/cors.js';
import { errorHandler } from './middleware/error-handler.js';
import { securityHeaders } from './middleware/security-headers.js';
import { createRateLimiter } from './middleware/rate-limit.js';
import { createPayloadLimit } from './middleware/payload-limit.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// In Docker: __dirname is /app/server/dist, so ../../client/dist -> /app/client/dist
// In dev: same relative path from server/dist
const clientDist = join(__dirname, '..', '..', 'client', 'dist');

const app = new Hono();
const db = createDb(process.env.DB_PATH || './secrets.db');
const repo = createRepository(db);

// Security middleware (applied globally)
app.use('*', securityHeaders);
app.use('*', cors);
app.onError(errorHandler);

// Rate limiting: 60 requests per minute per IP on API routes
const apiRateLimit = createRateLimiter({ windowMs: 60_000, maxRequests: 60 });
app.use('/api/*', apiRateLimit);

// Payload size limit: 64KB max on API routes
const payloadLimit = createPayloadLimit(65536);
app.use('/api/*', payloadLimit);

// API routes
const secretsRouter = createSecretsRouter(repo);
app.route('/api/secrets', secretsRouter);

// Static files (serve client SPA)
app.use('/*', serveStatic({ root: clientDist }));

// SPA fallback - serve index.html for all non-API routes
app.get('*', async (c) => {
  try {
    const html = await readFile(join(clientDist, 'index.html'), 'utf-8');
    return c.html(html);
  } catch {
    return c.notFound();
  }
});

// Start server
const port = parseInt(process.env.PORT || '3000');
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});

// Cleanup expired secrets every 60 seconds
setInterval(() => {
  const count = repo.cleanupExpired();
  if (count > 0) console.log(`Cleaned up ${count} expired secrets`);
}, 60_000);
