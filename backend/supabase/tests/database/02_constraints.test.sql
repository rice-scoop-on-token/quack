-- 데이터를 지키는 제약, 삭제 동작, character_stats view
-- 실행: backend/에서 npx supabase@2.122.0 test db
-- 파일 전체가 한 트랜잭션이고 마지막에 rollback하므로 시험 데이터가 남지 않는다.
--
-- 고정 id
--   사용자 A aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa, 사용자 B bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb
--   A 폴더 aaaaaaaa-0000-4000-8000-0000000000f1·f2(둘 다 오리), B 폴더 bbbbbbbb-0000-4000-8000-0000000000f1
--   A 세션 aaaaaaaa-0000-4000-8000-0000000000a1(f1)·a2(f2), B 세션 bbbbbbbb-0000-4000-8000-0000000000a1
--   A 자료 aaaaaaaa-0000-4000-8000-0000000000b1, A 퀴즈 aaaaaaaa-0000-4000-8000-0000000000c1

begin;
create extension if not exists pgtap with schema extensions;
-- 시험 개수를 적지 않는다. 시험을 추가할 때 개수를 고치지 않아도 되게 하기 위해서다.
select no_plan();

-- 준비 (postgres 권한)

insert into auth.users (id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

insert into public.profiles (id, display_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '에이'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '비');

insert into public.folders (id, user_id, name, species_id) values
  ('aaaaaaaa-0000-4000-8000-0000000000f1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'A 폴더', 'rubber_duck'),
  ('aaaaaaaa-0000-4000-8000-0000000000f2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'A 둘째 폴더', 'rubber_duck'),
  ('bbbbbbbb-0000-4000-8000-0000000000f1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B 폴더', 'raccoon');

insert into public.sessions (id, user_id, folder_id, goal) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-0000000000f1', '목표'),
  ('aaaaaaaa-0000-4000-8000-0000000000a2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-0000000000f2', '목표'),
  ('bbbbbbbb-0000-4000-8000-0000000000a1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-0000-4000-8000-0000000000f1', '목표');

insert into public.materials (id, user_id, folder_id, kind, title) values
  ('aaaaaaaa-0000-4000-8000-0000000000b1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-0000000000f1', 'text', '자료');

insert into public.explanation_turns (session_id, seq, trigger, input_mode, text) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 1, 'self', 'chat', '설명');

insert into public.quizzes (id, session_id) values
  ('aaaaaaaa-0000-4000-8000-0000000000c1', 'aaaaaaaa-0000-4000-8000-0000000000a1');

insert into public.quiz_attempts (quiz_id, answers, correct_count, total_count) values
  ('aaaaaaaa-0000-4000-8000-0000000000c1', '[]', 0, 0);

insert into public.reports (session_id, xp_before, summary, duration_seconds, turn_count) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 0, '요약', 1, 1);

-- 서버가 service role로 쓰는 지급 내역. 이 파일은 postgres 권한이라 RLS 없이 바로 넣는다.
insert into public.xp_ledger (user_id, folder_id, amount, reason, session_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-0000000000f1', 50, 'session_reward', 'aaaaaaaa-0000-4000-8000-0000000000a1'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-0000000000f2', 20, 'session_reward', 'aaaaaaaa-0000-4000-8000-0000000000a2'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-0000-4000-8000-0000000000f1', 30, 'session_reward', 'bbbbbbbb-0000-4000-8000-0000000000a1');

-- 다른 사용자의 폴더 (사용자 A로)

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.sessions (user_id, folder_id, goal)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-0000-4000-8000-0000000000f1', '남의 폴더') $$,
  '23503', null, 'A는 B의 폴더에 세션을 만들 수 없다 (복합 외래키)'
);
select throws_ok(
  $$ insert into public.materials (user_id, folder_id, kind, title)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-0000-4000-8000-0000000000f1', 'text', '남의 폴더') $$,
  '23503', null, 'A는 B의 폴더에 자료를 만들 수 없다 (복합 외래키)'
);

-- character_stats: 폴더(캐릭터)마다 한 행, 자기 폴더만

select results_eq(
  $$ select folder_id, user_id, species_id, total_xp from public.character_stats order by folder_id $$,
  $$ values ('aaaaaaaa-0000-4000-8000-0000000000f1'::uuid, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 'rubber_duck', 50),
            ('aaaaaaaa-0000-4000-8000-0000000000f2'::uuid, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 'rubber_duck', 20) $$,
  'A는 자기 폴더마다 경험치 합계를 본다'
);
select results_eq(
  $$ select count(*)::int from public.xp_ledger where user_id <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  $$ values (0) $$,
  'A는 자기 경험치 내역만 본다'
);

-- 폴더의 동물

select throws_ok(
  $$ insert into public.folders (user_id, name) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '동물 없는 폴더') $$,
  '23502', null, '폴더는 동물 없이 만들 수 없다'
);
select throws_ok(
  $$ insert into public.folders (user_id, name, species_id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '없는 동물', 'dragon') $$,
  '23503', null, '없는 동물로는 폴더를 만들 수 없다'
);
select lives_ok(
  $$ insert into public.folders (user_id, name, species_id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '셋째 오리 폴더', 'rubber_duck') $$,
  '같은 동물을 여러 폴더에서 고를 수 있다'
);
select results_eq(
  $$ select total_xp from public.character_stats where species_id = 'rubber_duck' and folder_id not in
       ('aaaaaaaa-0000-4000-8000-0000000000f1', 'aaaaaaaa-0000-4000-8000-0000000000f2') $$,
  $$ values (0) $$,
  '새 폴더의 캐릭터는 경험치 0으로 보인다'
);

set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "role": "authenticated"}';

select results_eq(
  $$ select folder_id, species_id, total_xp from public.character_stats $$,
  $$ values ('bbbbbbbb-0000-4000-8000-0000000000f1'::uuid, 'raccoon', 30) $$,
  'B는 자기 폴더의 합계만 본다'
);

reset role;

-- 경험치 내역 (서버가 쓰는 테이블이라 postgres 권한으로 시험한다)

select throws_ok(
  $$ insert into public.xp_ledger (user_id, folder_id, amount, reason, session_id)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-0000000000f1', 50, 'session_reward', 'aaaaaaaa-0000-4000-8000-0000000000a1') $$,
  '23505', null, '같은 세션의 경험치 보상은 한 번만 기록된다'
);
select throws_ok(
  $$ insert into public.xp_ledger (user_id, folder_id, amount, reason)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-0000000000f1', 10, 'item_purchase') $$,
  '23514', null, '경험치 내역의 사유는 session_reward뿐이다'
);
select throws_ok(
  $$ insert into public.xp_ledger (user_id, folder_id, amount, reason)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-0000000000f1', -10, 'session_reward') $$,
  '23514', null, '음수 경험치는 기록할 수 없다'
);
select throws_ok(
  $$ insert into public.xp_ledger (user_id, folder_id, amount, reason)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-0000-4000-8000-0000000000f1', 10, 'session_reward') $$,
  '23503', null, 'A의 경험치를 B의 폴더에 기록할 수 없다 (복합 외래키)'
);

-- 한 번만 생기는 행

select throws_ok(
  $$ insert into public.quiz_attempts (quiz_id, answers, correct_count, total_count)
     values ('aaaaaaaa-0000-4000-8000-0000000000c1', '[]', 0, 0) $$,
  '23505', null, '퀴즈는 한 번만 제출된다'
);
select throws_ok(
  $$ insert into public.reports (session_id, xp_before, summary, duration_seconds, turn_count)
     values ('aaaaaaaa-0000-4000-8000-0000000000a1', 0, '요약', 1, 1) $$,
  '23505', null, '세션 하나에 리포트는 하나다'
);

-- 폴더 삭제 (사용자 A로)

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}';

select results_eq(
  $$ delete from public.folders where id = 'aaaaaaaa-0000-4000-8000-0000000000f1' returning name $$,
  $$ values ('A 폴더') $$,
  'A는 자기 폴더를 지울 수 있다'
);

reset role;

select is_empty($$ select id from public.sessions where folder_id = 'aaaaaaaa-0000-4000-8000-0000000000f1' $$, '폴더의 세션이 함께 지워진다');
select is_empty($$ select id from public.materials where folder_id = 'aaaaaaaa-0000-4000-8000-0000000000f1' $$, '폴더의 자료가 함께 지워진다');
select is_empty($$ select id from public.explanation_turns where session_id = 'aaaaaaaa-0000-4000-8000-0000000000a1' $$, '세션의 설명이 함께 지워진다');
select is_empty($$ select id from public.quizzes where session_id = 'aaaaaaaa-0000-4000-8000-0000000000a1' $$, '세션의 퀴즈가 함께 지워진다');
select is_empty($$ select id from public.quiz_attempts where quiz_id = 'aaaaaaaa-0000-4000-8000-0000000000c1' $$, '퀴즈 제출이 함께 지워진다');
select is_empty($$ select id from public.reports where session_id = 'aaaaaaaa-0000-4000-8000-0000000000a1' $$, '세션의 리포트가 함께 지워진다');

-- 폴더의 캐릭터가 사라지므로 경험치 내역도 함께 지워진다(docs/decisions/0003).
select results_eq(
  $$ select folder_id, amount from public.xp_ledger where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  $$ values ('aaaaaaaa-0000-4000-8000-0000000000f2'::uuid, 20) $$,
  '지운 폴더의 경험치 내역은 지워지고 다른 폴더의 내역은 남는다'
);
select results_eq(
  $$ select folder_id, total_xp from public.character_stats
     where folder_id in ('aaaaaaaa-0000-4000-8000-0000000000f1', 'aaaaaaaa-0000-4000-8000-0000000000f2') $$,
  $$ values ('aaaaaaaa-0000-4000-8000-0000000000f2'::uuid, 20) $$,
  '지운 폴더의 캐릭터 행은 없어지고 다른 폴더의 경험치는 그대로다'
);

select * from finish();
rollback;
