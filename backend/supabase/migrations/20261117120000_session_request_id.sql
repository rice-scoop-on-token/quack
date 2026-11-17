-- 공부 시작 요청의 재시도 키 (POST /sessions/start, shared startSessionRequestSchema의 request_id)
--
-- 앱은 '공부 시작'을 한 번 누를 때마다 request_id를 만들고, 응답을 못 받아 다시 보낼 때는 같은 값을 쓴다.
-- 서버는 같은 사용자·같은 request_id로 이미 만든 세션이 있으면 새로 만들지 않고 그 세션을 돌려준다.
-- 코드에서 먼저 조회하는 것만으로는 동시에 들어온 두 요청이 함께 통과할 수 있어서, DB 제약으로 하나만 저장되게 막는다.
--
-- - 기존 세션과 앱이 직접 만드는 세션에는 값이 없다(null). null끼리는 unique에 걸리지 않는다.
-- - 앱 역할에는 이 칸의 추가 권한을 주지 않는다. 서버가 service role로 저장한다.
-- - 다른 사용자는 같은 값을 써도 된다. 사용자마다 따로 세는 키이기 때문이다.

alter table public.sessions
  add column request_id uuid;

alter table public.sessions
  add constraint sessions_user_id_request_id_key unique (user_id, request_id);
