import type { ErrorHandler } from 'hono';

export const errorHandler: ErrorHandler = (err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal server error' }, 500);
};
