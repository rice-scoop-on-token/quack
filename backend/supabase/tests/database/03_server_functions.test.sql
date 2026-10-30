-- server 스키마의 권한과 서버용 SQL 함수 동작
-- 실행: backend/에서 npx supabase@2.122.0 test db
-- 파일 전체가 한 트랜잭션이고 마지막에 rollback하므로 시험 데이터가 남지 않는다.
--
-- 동시 요청(사용자별 잠금, 사용량 한도 동시 차감)은 한 트랜잭션 안에서 시험할 수 없어 여기에 없다.
-- 서버 코드는 service role로 함수를 부르므로, 함수 동작은 set local role service_role로 시험한다.
--
-- 고정 id
--   사용자 A aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa, 사용자 B bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb
--   A 폴더 aaaaaaaa-0000-4000-8000-0000000000f1, B 폴더 bbbbbbbb-0000-4000-8000-0000000000f1
--   A 세션: 진행 중 ...a0, 종료 ...a1 / B 세션: 종료 bbbbbbbb-0000-4000-8000-0000000000a1

begin;
create extension if not exists pgtap with schema extensions;
-- 시험 개수를 적지 않는다. 시험을 추가할 때 개수를 고치지 않아도 되게 하기 위해서다.
select no_plan();

-- server 스키마 전체 검사
-- 함수 이름을 적지 않고 스키마의 모든 함수를 훑는다. 나중에 추가하는 함수도 자동으로 검사된다.

select ok(
  (select count(*) from pg_proc where pronamespace = 'server'::regnamespace) > 0,
  'server 스키마에 함수가 있다 (없으면 아래 검사가 아무것도 검사하지 않고 통과한다)'
);
select is_empty(
  $$ select p.oid::regprocedure::text, r.role_name
     from pg_proc p
     cross join (values ('anon'), ('authenticated')) as r (role_name)
     where p.pronamespace = 'server'::regnamespace
       and has_function_privilege(r.role_name, p.oid, 'EXECUTE') $$,
  'anon·authenticated가 실행할 수 있는 server 함수가 없다'
);
select is_empty(
  $$ select oid::regprocedure::text from pg_proc
     where pronamespace = 'server'::regnamespace
       and not has_function_privilege('service_role', oid, 'EXECUTE') $$,
  'service_role은 모든 server 함수를 실행할 수 있다'
);
select is_empty(
  $$ select oid::regprocedure::text from pg_proc
     where pronamespace = 'server'::regnamespace
       and not ('search_path=""' = any (coalesce(proconfig, '{}'))) $$,
  '모든 server 함수에 search_path = '''' 가 붙어 있다'
);
select is_empty(
  $$ select oid::regprocedure::text from pg_proc
     where pronamespace = 'server'::regnamespace and prosecdef $$,
  'security definer인 server 함수가 없다'
);
select ok(not has_schema_privilege('anon', 'server', 'USAGE'), 'anon은 server 스키마를 쓸 수 없다');
select ok(not has_schema_privilege('authenticated', 'server', 'USAGE'), 'authenticated는 server 스키마를 쓸 수 없다');
select ok(has_schema_privilege('service_role', 'server', 'USAGE'), 'service_role은 server 스키마를 쓸 수 있다');

-- 준비 (postgres 권한)

insert into auth.users (id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

-- character_stats는 profiles를 기준으로 합계 행을 만든다.
insert into public.profiles (id, display_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '에이'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '비');

insert into public.folders (id, user_id, name) values
  ('aaaaaaaa-0000-4000-8000-0000000000f1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'A 폴더'),
  ('bbbbbbbb-0000-4000-8000-0000000000f1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B 폴더');

insert into public.sessions (id, user_id, folder_id, goal, status) values
  ('aaaaaaaa-0000-4000-8000-0000000000a0', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-0000000000f1', '진행 중', 'active'),
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-0000000000f1', '종료', 'finished'),
  ('bbbbbbbb-0000-4000-8000-0000000000a1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-0000-4000-8000-0000000000f1', '종료', 'finished');

-- 앱 역할은 함수를 직접 부를 수 없다

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}';

select throws_ok(
  $$ select server.consume_ai_quota('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'analysis', 5) $$,
  '42501', null, '앱 사용자는 server 함수를 호출할 수 없다'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select server.grant_session_reward(
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-0000000000a1',
       9999, '요약', '{}', '{}', 1, 1, null, null) $$,
  '42501', null, '로그인 전에는 server 함수를 호출할 수 없다'
);

-- 여기부터 서버(service role)로 호출한다

set local role service_role;
set local request.jwt.claims = '{"role": "service_role"}';

-- consume_ai_quota

select is(server.consume_ai_quota('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'analysis', 2), true, '한도 2: 첫 번째는 true');
select is(server.consume_ai_quota('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'analysis', 2), true, '한도 2: 두 번째는 true');
select is(server.consume_ai_quota('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'analysis', 2), false, '한도 2: 세 번째는 false');
select is(server.consume_ai_quota('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'quiz', 2), true, '종류가 다르면 따로 센다');
select is(server.consume_ai_quota('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'report', 0), false, '한도 0이면 false');
select results_eq(
  $$ select kind, count from public.ai_usage
     where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' order by kind $$,
  $$ values ('analysis', 2), ('quiz', 1) $$,
  '한도에 걸린 호출은 사용량을 올리지 않는다'
);
select is(
  (select usage_date from public.ai_usage where kind = 'analysis'),
  (now() at time zone 'Asia/Seoul')::date,
  '사용량 날짜는 서울 시간 기준이다'
);

-- grant_session_reward

select throws_ok(
  $$ select server.grant_session_reward(
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-0000000000a0',
       120, '요약', '{}', '{}', 600, 3, null, null) $$,
  'P0001', 'INVALID_STATE', '진행 중(active) 세션에는 지급하지 않는다'
);

-- 첫 응답과 재요청 응답을 비교하려고 결과를 임시 테이블에 담는다.
create temp table first_reward as
select server.grant_session_reward(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-0000000000a1',
  120, '요약', '{개념1}', '{}', 600, 3, 2, 3) as r;

select is((select r -> 'granted' from first_reward), 'true'::jsonb, '종료된 세션에 지급한다');
select is(
  (select r - 'granted' - 'report_id' from first_reward),
  '{"xp": 120, "xp_before": 0, "xp_after": 120}'::jsonb,
  '지급 값이 맞다'
);

-- 저장된 값 확인은 RLS 없이 보려고 postgres로 돌아간다.
reset role;

select results_eq(
  $$ select status from public.sessions where id = 'aaaaaaaa-0000-4000-8000-0000000000a1' $$,
  $$ values ('reported') $$,
  '세션이 reported가 된다'
);
select results_eq(
  $$ select id, xp_before from public.reports where session_id = 'aaaaaaaa-0000-4000-8000-0000000000a1' $$,
  $$ select (r ->> 'report_id')::uuid, 0 from first_reward $$,
  '리포트가 저장되고 xp_before가 기록된다'
);

set local role service_role;

-- 재요청은 다른 인자를 줘도 저장된 값으로 같은 응답을 돌려준다.
create temp table again_reward as
select server.grant_session_reward(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-0000000000a1',
  999, '다른 요약', '{}', '{}', 1, 1, null, null) as r;

select is((select r -> 'granted' from again_reward), 'false'::jsonb, '재요청은 granted = false');
select is(
  (select r - 'granted' from again_reward),
  (select r - 'granted' from first_reward),
  '재요청은 첫 응답과 같은 값을 돌려준다'
);

reset role;

select results_eq(
  $$ select (select count(*) from public.xp_ledger where session_id = 'aaaaaaaa-0000-4000-8000-0000000000a1')::int,
            (select count(*) from public.reports where session_id = 'aaaaaaaa-0000-4000-8000-0000000000a1')::int $$,
  $$ values (1, 1) $$,
  '재요청 후에도 내역과 리포트는 하나씩이다'
);

set local role service_role;

select throws_ok(
  $$ select server.grant_session_reward(
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-0000-4000-8000-0000000000a1',
       10, '요약', '{}', '{}', 1, 1, null, null) $$,
  'P0001', 'NOT_FOUND', '다른 사용자의 세션은 NOT_FOUND'
);
-- ErrorCode가 아닌 메시지라 서비스에서 INTERNAL_ERROR가 된다(서버 코드의 잘못).
select throws_ok(
  $$ select server.grant_session_reward(
       'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-0000-4000-8000-0000000000a1',
       -1, '요약', '{}', '{}', 1, 1, null, null) $$,
  'P0001', 'p_xp는 0 이상이어야 한다', '음수 경험치는 거절한다'
);

reset role;

select results_eq(
  $$ select total_xp from public.character_stats
     where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  $$ values (120) $$,
  '합계가 지급을 반영한다'
);

select * from finish();
rollback;
