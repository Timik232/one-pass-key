import { createMiddleware } from 'hono/factory';
import type { MiddlewareHandler } from 'hono';

const DEFAULT_MAX_BYTES = 65536; // 64 KB

/**
 * Rejects requests whose body exceeds `maxBytes`.
 *
 * Checks the Content-Length header first for a fast rejection.
 * If the header is absent, it reads the full body and checks its size.
 */
export function createPayloadLimit(maxBytes: number = DEFAULT_MAX_BYTES): MiddlewareHandler {
  return createMiddleware(async (c, next) => {
    // GET/HEAD/DELETE typically have no body — skip them
    const method = c.req.method;
    if (method === 'GET' || method === 'HEAD' || method === 'DELETE') {
      await next();
      return;
    }

    // Fast path: reject immediately if Content-Length is known and too large
    const contentLength = c.req.header('Content-Length');
    if (contentLength) {
      const length = parseInt(contentLength, 10);
      if (!isNaN(length) && length > maxBytes) {
        return c.json(
          { error: 'payload_too_large', message: 'Request body exceeds maximum allowed size.' },
          413,
        );
      }
    }

    // Read body when Content-Length is absent (or we trust but verify)
    const body = await c.req.raw.clone().arrayBuffer();
    if (body.byteLength > maxBytes) {
      return c.json(
        { error: 'payload_too_large', message: 'Request body exceeds maximum allowed size.' },
        413,
      );
    }

    await next();
  });
}
