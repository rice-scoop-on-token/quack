import { Hono } from 'hono';
import { z } from 'zod';

import { respond } from '../middleware/respond.ts';

// 앱과의 계약이 아니라 함수 동작 확인용이라 shared가 아닌 이 파일에 둔다.
const healthResponseSchema = z.object({ ok: z.literal(true) });

// 함수가 실행 중인지 확인하는 용도다. 다른 라우트도 이 파일처럼 Hono 앱을 만들어 export하고 index.ts에서 연결한다.
export const healthRoute = new Hono();

healthRoute.get('/', (c) => respond(c, healthResponseSchema, { ok: true }));
