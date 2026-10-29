import { Hono } from 'hono';

import { finishSessionResponseSchema, uuidParamSchema } from '@quack/shared';

import type { AuthEnv } from '../middleware/auth.ts';
import { respond } from '../middleware/respond.ts';
import { validateParams } from '../middleware/validate.ts';
import { finishSession } from '../services/sessions.service.ts';

export const sessionsRoute = new Hono<AuthEnv>();

sessionsRoute.post('/:id/finish', validateParams(uuidParamSchema), async (c) => {
  const { id } = c.req.valid('param');

  const result = await finishSession(c.var.userDb, c.var.adminDb, c.var.userId, id);

  return respond(c, finishSessionResponseSchema, result);
});
