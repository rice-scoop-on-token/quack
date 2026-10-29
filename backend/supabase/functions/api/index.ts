import { Hono } from 'hono';

import { authMiddleware } from './middleware/auth.ts';
import { corsMiddleware } from './middleware/cors.ts';
import { errorHandler, notFoundHandler } from './middleware/error.ts';
import { healthRoute } from './routes/health.ts';
import { meRoute } from './routes/me.ts';

// Supabase는 요청 경로 앞에 함수 이름(/api)을 붙여 넘기므로 basePath를 함수 이름과 맞춘다.
const app = new Hono().basePath('/api');

app.use('*', corsMiddleware);

// 인증 없이 쓰는 라우트는 auth 미들웨어보다 위에 둔다.
app.route('/health', healthRoute);

// Hono는 미들웨어를 그보다 아래에 등록한 라우트에만 적용한다. 이 줄 아래의 라우트는 모두 인증을 거친다.
app.use('*', authMiddleware);

// 인증이 필요한 라우트는 여기 아래에 등록한다.
app.route('/me', meRoute);

app.onError(errorHandler);
app.notFound(notFoundHandler);

export default { fetch: app.fetch };
