import { Hono } from 'hono';

import { transcribeResponseSchema } from '@quack/shared';

import type { AuthEnv } from '../middleware/auth.ts';
import { respond } from '../middleware/respond.ts';
import { validateSpeechUpload } from '../middleware/speechUpload.ts';
import { createSpeechDependencies, transcribeSpeech } from '../services/speech.service.ts';

export const speechRoute = new Hono<AuthEnv>();

speechRoute.post('/transcribe', validateSpeechUpload, async (c) => {
  const upload = c.req.valid('form');

  const result = await transcribeSpeech(c.var.userId, upload, createSpeechDependencies(c.var.adminDb));

  return respond(c, transcribeResponseSchema, result);
});
