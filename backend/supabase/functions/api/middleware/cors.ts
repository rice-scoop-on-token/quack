import { cors } from 'hono/cors';

// 웹(Expo web)에서 supabase-js로 함수를 호출할 때 브라우저가 보내는 헤더를 허용한다.
export const corsMiddleware = cors({
  origin: '*',
  allowHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});
