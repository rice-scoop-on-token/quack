import { Hono } from 'hono';

import {
  quizResponseSchema,
  submitQuizRequestSchema,
  submitQuizResponseSchema,
  uuidParamSchema,
} from '@quack/shared';

import type { AuthEnv } from '../middleware/auth.ts';
import { respond } from '../middleware/respond.ts';
import { validateJson, validateParams } from '../middleware/validate.ts';
import { getQuiz, submitQuiz } from '../services/quizzes.service.ts';

export const quizzesRoute = new Hono<AuthEnv>();

quizzesRoute.get('/:id', validateParams(uuidParamSchema), async (c) => {
  const { id } = c.req.valid('param');

  const quiz = await getQuiz(c.var.userDb, c.var.adminDb, id);

  // 정답이 섞여 나가지 않도록 문항은 quizQuestionPublicSchema 모양으로만 보낸다.
  return respond(c, quizResponseSchema, { quiz });
});

quizzesRoute.post(
  '/:id/submit',
  validateParams(uuidParamSchema),
  validateJson(submitQuizRequestSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { answers } = c.req.valid('json');

    const result = await submitQuiz(c.var.userDb, c.var.adminDb, id, answers);

    return respond(c, submitQuizResponseSchema, result);
  },
);
