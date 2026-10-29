import { Hono } from 'hono';

// 함수가 실행 중인지 확인하는 용도다. 다른 라우트도 이 파일처럼 Hono 앱을 만들어 export하고 index.ts에서 연결한다.
export const healthRoute = new Hono();

healthRoute.get('/', (c) => c.json({ ok: true }));
