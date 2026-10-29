import { Hono } from 'hono';

import { corsMiddleware } from './middleware/cors.ts';
import { errorHandler, notFoundHandler } from './middleware/error.ts';
import { healthRoute } from './routes/health.ts';

// Supabase는 요청 경로 앞에 함수 이름(/api)을 붙여 넘기므로 basePath를 함수 이름과 맞춘다.
const app = new Hono().basePath('/api');

app.use('*', corsMiddleware);

app.route('/health', healthRoute);

app.onError(errorHandler);
app.notFound(notFoundHandler);

export default { fetch: app.fetch };
