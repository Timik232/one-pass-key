import { createMiddleware } from 'hono/factory';

export const cors = createMiddleware(async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    c.res = new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
    return;
  }
  await next();
  c.res.headers.set('Access-Control-Allow-Origin', '*');
});
