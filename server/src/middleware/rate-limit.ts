import { createMiddleware } from 'hono/factory';
import type { MiddlewareHandler } from 'hono';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory sliding window rate limiter.
 * Tracks requests by IP address and rejects when the limit is exceeded.
 */
export function createRateLimiter(options: RateLimitOptions): MiddlewareHandler {
  const { windowMs, maxRequests } = options;
  const store = new Map<string, RateLimitEntry>();
  let cleanupTimer: ReturnType<typeof setInterval> | undefined;

  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  };

  // Periodic cleanup — start on first use and reuse the timer
  return createMiddleware(async (c, next) => {
    if (!cleanupTimer) {
      cleanupTimer = setInterval(cleanup, windowMs);
      cleanupTimer.unref();
    }

    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      c.req.header('x-real-ip') ||
      'unknown';

    const now = Date.now();
    let entry = store.get(ip);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(ip, entry);
    }

    entry.count++;

    const remaining = Math.max(0, maxRequests - entry.count);
    const resetEpoch = Math.ceil(entry.resetAt / 1000);

    c.res.headers.set('X-RateLimit-Limit', String(maxRequests));
    c.res.headers.set('X-RateLimit-Remaining', String(remaining));
    c.res.headers.set('X-RateLimit-Reset', String(resetEpoch));

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return c.json(
        { error: 'rate_limit_exceeded', message: 'Too many requests. Try again later.' },
        429,
        { 'Retry-After': String(retryAfter) },
      );
    }

    await next();
  });
}

/**
 * Per-secret-id passphrase attempt rate limiter.
 * Allows max 5 failed decryption attempts per secret ID within a 15-minute window.
 * Call `recordPassphraseSuccess(secretId)` when decryption succeeds to reset the counter.
 */
export function createPassphraseRateLimiter(): {
  middleware: MiddlewareHandler;
  recordPassphraseSuccess: (secretId: string) => void;
} {
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;
  const store = new Map<string, RateLimitEntry>();
  let cleanupTimer: ReturnType<typeof setInterval> | undefined;

  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  };

  const middleware = createMiddleware(async (c, next) => {
    if (!cleanupTimer) {
      cleanupTimer = setInterval(cleanup, windowMs);
      cleanupTimer.unref();
    }

    // Extract secret ID from path parameter
    const secretId = c.req.param('id');
    if (!secretId) {
      await next();
      return;
    }

    const now = Date.now();
    let entry = store.get(secretId);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(secretId, entry);
    }

    entry.count++;

    if (entry.count > maxAttempts) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return c.json(
        { error: 'rate_limit_exceeded', message: 'Too many attempts. Try again later.' },
        429,
        { 'Retry-After': String(retryAfter) },
      );
    }

    await next();
  });

  const recordPassphraseSuccess = (secretId: string) => {
    store.delete(secretId);
  };

  return { middleware, recordPassphraseSuccess };
}
