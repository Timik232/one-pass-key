import { createMiddleware } from 'hono/factory';

const ALLOWED_PATTERNS: (string | RegExp)[] = (() => {
  const env = process.env.ALLOWED_ORIGINS;
  if (!env) return [];

  return env
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(pattern => {
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        const inner = pattern.slice(1, -1);
        try {
          return new RegExp(inner);
        } catch {
          return null;
        }
      }
      return pattern;
    })
    .filter((p): p is string | RegExp => p !== null);
})();

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_PATTERNS.length === 0) return false;

  return ALLOWED_PATTERNS.some(pattern =>
    typeof pattern === 'string' ? pattern === origin : pattern.test(origin),
  );
}

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'false',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
});

export const cors = createMiddleware(async (c, next) => {
  const origin = c.req.header('Origin') || '';

  if (c.req.method === 'OPTIONS') {
    if (isAllowedOrigin(origin)) {
      c.res = new Response(null, { status: 204, headers: corsHeaders(origin) });
    } else {
      c.res = new Response(null, { status: 403 });
    }
    return;
  }

  await next();

  if (isAllowedOrigin(origin)) {
    for (const [key, value] of Object.entries(corsHeaders(origin))) {
      c.res.headers.set(key, value);
    }
  }
});
