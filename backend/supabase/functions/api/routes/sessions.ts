import { Hono } from 'hono';

import {
  createTurnRequestSchema,
  createTurnResponseSchema,
  finishSessionResponseSchema,
  uuidParamSchema,
} from '@quack/shared';

import type { AuthEnv } from '../middleware/auth.ts';
import { respond } from '../middleware/respond.ts';
import { validateJson, validateParams } from '../middleware/validate.ts';
import { finishSession } from '../services/sessions.service.ts';
import { createTurn } from '../services/turns.service.ts';

export const sessionsRoute = new Hono<AuthEnv>();

sessionsRoute.post(
  '/:id/turns',
  validateParams(uuidParamSchema),
  validateJson(createTurnRequestSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');

    const result = await createTurn(c.var.userDb, c.var.adminDb, c.var.userId, id, body);

    // 내부 분석(근거, 누락·오류 목록)은 응답 스키마에 없어 여기서 걸러진다.
    return respond(c, createTurnResponseSchema, result);
  },
);

sessionsRoute.post('/:id/finish', validateParams(uuidParamSchema), async (c) => {
  const { id } = c.req.valid('param');

  const result = await finishSession(c.var.userDb, c.var.adminDb, c.var.userId, id);

  return respond(c, finishSessionResponseSchema, result);
});
