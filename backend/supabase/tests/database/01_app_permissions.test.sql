-- 앱 역할(authenticated, anon)의 권한과 RLS
-- 실행: backend/에서 npx supabase@2.122.0 test db
-- 파일 전체가 한 트랜잭션이고 마지막에 rollback하므로 시험 데이터가 남지 않는다.
--
-- 앱 사용자 흉내: set local role authenticated + request.jwt.claims의 sub.
-- auth.uid()가 request.jwt.claims의 sub를 읽는다. Data API(PostgREST)도 요청마다 같은 형태로 넣는다.
--
-- 권한을 의도적으로 바꾸면 아래 "앱 권한 표" 기대값과 docs/decisions/0002-db-permissions.md의 표를 함께 고친다.
--
-- 고정 id
--   사용자 A aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa, 사용자 B bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb
--   A 폴더 aaaaaaaa-0000-4000-8000-0000000000f1, A의 지울 폴더 ...f2, B 폴더 bbbbbbbb-0000-4000-8000-0000000000f1
--   A 세션 aaaaaaaa-0000-4000-8000-0000000000a1, A 자료 aaaaaaaa-0000-4000-8000-0000000000b1

begin;
create extension if not exists pgtap with schema extensions;
-- 시험 개수를 적지 않는다. 시험을 추가할 때 개수를 고치지 않아도 되게 하기 위해서다.
select no_plan();

-- 준비 (postgres 권한)

insert into auth.users (id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

insert into public.profiles (id, display_name) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '비');

insert into public.folders (id, user_id, name) values
  ('aaaaaaaa-0000-4000-8000-0000000000f1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'A 폴더'),
  ('aaaaaaaa-0000-4000-8000-0000000000f2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '지울 폴더'),
  ('bbbbbbbb-0000-4000-8000-0000000000f1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B 폴더');

insert into public.sessions (id, user_id, folder_id, goal) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-0000000000f1', '목표');

insert into public.materials (id, user_id, folder_id, kind, title) values
  ('aaaaaaaa-0000-4000-8000-0000000000b1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-0000000000f1', 'text', '자료');

insert into public.items (id, name, slot, asset_key, unlock) values
  ('t_hat', '시험 모자', 'head', 't_hat', '{"type": "level", "level": 1}');

insert into public.user_items (user_id, item_id, source) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 't_hat', 'reward');

insert into public.reports (session_id, xp_before, summary, duration_seconds, turn_count) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 0, '요약', 1, 1);

-- 스키마 전체 검사: 나중에 추가하는 테이블도 함께 검사된다.

select is_empty(
  $$ select c.relname from pg_class c
     where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') and not c.relrowsecurity $$,
  'public의 모든 테이블에 RLS가 켜져 있다'
);

select is_empty(
  $$ select c.relname, p.priv
     from pg_class c
     cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')) as p (priv)
     where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm')
       and has_any_column_privilege('anon', c.oid, p.priv)
     union all
     select c.relname, p.priv
     from pg_class c
     cross join (values ('DELETE'), ('TRUNCATE'), ('TRIGGER')) as p (priv)
     where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm')
       and has_table_privilege('anon', c.oid, p.priv) $$,
  'anon(로그인 전)은 public의 어떤 테이블에도 권한이 없다'
);

-- 앱 권한 표: authenticated가 가진 권한 전체가 0002의 표와 같아야 한다.
-- 테이블 전체 권한이면 '*', 칸 단위 권한이면 칸 이름 목록이다. 새 칸에 실수로 권한이 열리면 여기서 실패한다.
select results_eq(
  $$ -- 카탈로그 이름(name 타입)은 collation이 "C"라서, 기대값과 비교할 수 있게 기본 collation으로 맞춘다.
     select table_name collate "default", privilege collate "default", columns collate "default" from (
       select c.relname::text, p.priv,
         case when has_table_privilege('authenticated', c.oid, p.priv) then '*'
         else (select string_agg(a.attname::text, ',' order by a.attname collate "C")
               from pg_attribute a
               where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
                 and has_column_privilege('authenticated', c.oid, a.attnum, p.priv))
         end
       from pg_class c
       cross join (values ('INSERT'), ('SELECT'), ('UPDATE')) as p (priv)
       where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm')
         and has_any_column_privilege('authenticated', c.oid, p.priv)
       union all
       select c.relname::text, 'DELETE', '*'
       from pg_class c
       where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm')
         and has_table_privilege('authenticated', c.oid, 'DELETE')
     ) as t (table_name, privilege, columns)
     order by table_name collate "C", privilege collate "C" $$,
  $$ values
       ('character_stats', 'SELECT', '*'),
       ('characters', 'INSERT', 'species_id,user_id'),
       ('characters', 'SELECT', '*'),
       ('explanation_turns', 'SELECT', '*'),
       ('folders', 'DELETE', '*'),
       ('folders', 'INSERT', 'name,user_id'),
       ('folders', 'SELECT', '*'),
       ('folders', 'UPDATE', 'name'),
       ('items', 'SELECT', '*'),
       ('materials', 'DELETE', '*'),
       ('materials', 'INSERT', 'folder_id,kind,storage_path,title,user_id'),
       ('materials', 'SELECT', '*'),
       ('materials', 'UPDATE', 'title'),
       ('point_ledger', 'SELECT', '*'),
       ('profiles', 'INSERT', 'display_name,id'),
       ('profiles', 'SELECT', '*'),
       ('profiles', 'UPDATE', 'display_name,onboarding_completed_at'),
       ('quiz_attempts', 'SELECT', '*'),
       ('quizzes', 'SELECT', '*'),
       ('reports', 'SELECT', '*'),
       ('sessions', 'INSERT', 'folder_id,goal,user_id'),
       ('sessions', 'SELECT', '*'),
       ('species', 'SELECT', '*'),
       ('user_items', 'SELECT', '*'),
       ('user_items', 'UPDATE', 'equipped'),
       ('xp_ledger', 'SELECT', '*') $$,
  'authenticated의 권한이 앱 권한 표와 같다'
);

-- 사용자 A로 전환

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}';

-- 허용

select lives_ok(
  $$ insert into public.profiles (id, display_name) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '에이') $$,
  'A는 자기 프로필을 만들 수 있다'
);
select results_eq(
  $$ update public.profiles set display_name = '에이2' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning display_name $$,
  $$ values ('에이2') $$,
  'A는 자기 프로필 이름을 바꿀 수 있다'
);
select results_eq(
  $$ select count(*)::int from public.species $$,
  $$ values (3) $$,
  'A는 동물 3종을 조회할 수 있다'
);
select lives_ok(
  $$ insert into public.characters (user_id, species_id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'rubber_duck') $$,
  'A는 캐릭터를 만들 수 있다'
);
select lives_ok(
  $$ insert into public.folders (user_id, name) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '새 폴더') $$,
  'A는 폴더를 만들 수 있다'
);
select results_eq(
  $$ update public.folders set name = 'A 폴더 수정' where id = 'aaaaaaaa-0000-4000-8000-0000000000f1' returning name $$,
  $$ values ('A 폴더 수정') $$,
  'A는 폴더 이름을 바꿀 수 있다'
);
select results_eq(
  $$ delete from public.folders where id = 'aaaaaaaa-0000-4000-8000-0000000000f2' returning name $$,
  $$ values ('지울 폴더') $$,
  'A는 자기 폴더를 지울 수 있다'
);
select lives_ok(
  $$ insert into public.sessions (user_id, folder_id, goal)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-0000000000f1', '새 목표') $$,
  'A는 자기 폴더에 세션을 만들 수 있다'
);
select results_eq(
  $$ select status from public.sessions where goal = '새 목표' $$,
  $$ values ('active') $$,
  '새 세션은 active로 시작한다'
);
select lives_ok(
  $$ insert into public.materials (user_id, folder_id, kind, title)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-0000000000f1', 'text', '새 자료') $$,
  'A는 자기 폴더에 자료를 만들 수 있다'
);
select results_eq(
  $$ update public.materials set title = '자료 수정' where id = 'aaaaaaaa-0000-4000-8000-0000000000b1' returning title $$,
  $$ values ('자료 수정') $$,
  'A는 자료 제목을 바꿀 수 있다'
);
select results_eq(
  $$ update public.user_items set equipped = true where item_id = 't_hat' returning equipped $$,
  $$ values (true) $$,
  'A는 아이템 장착 여부를 바꿀 수 있다'
);

-- 거절: 앱이 쓸 수 없는 칸과 테이블 (42501 권한 없음)

select throws_ok(
  $$ update public.sessions set status = 'reported' where id = 'aaaaaaaa-0000-4000-8000-0000000000a1' $$,
  '42501', null, 'sessions.status는 바꿀 수 없다'
);
select throws_ok(
  $$ update public.materials set status = 'ready' where id = 'aaaaaaaa-0000-4000-8000-0000000000b1' $$,
  '42501', null, 'materials.status는 바꿀 수 없다'
);
select throws_ok(
  $$ update public.materials set key_concepts = '{가짜}' where id = 'aaaaaaaa-0000-4000-8000-0000000000b1' $$,
  '42501', null, 'materials.key_concepts는 바꿀 수 없다'
);
select throws_ok(
  $$ insert into public.user_items (user_id, item_id, source) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 't_hat', 'purchase') $$,
  '42501', null, 'user_items에 행을 추가할 수 없다'
);
select throws_ok(
  $$ update public.user_items set source = 'purchase' where item_id = 't_hat' $$,
  '42501', null, 'user_items.source는 바꿀 수 없다'
);
select throws_ok(
  $$ update public.user_items set session_id = null where item_id = 't_hat' $$,
  '42501', null, 'user_items.session_id는 바꿀 수 없다'
);
select throws_ok(
  $$ insert into public.xp_ledger (user_id, amount, reason) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 9999, 'session_reward') $$,
  '42501', null, 'xp_ledger에 행을 추가할 수 없다'
);
select throws_ok(
  $$ insert into public.point_ledger (user_id, amount, reason) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 9999, 'session_reward') $$,
  '42501', null, 'point_ledger에 행을 추가할 수 없다'
);
select throws_ok(
  $$ insert into public.reports (session_id, xp_before, summary, duration_seconds, turn_count)
     values ('aaaaaaaa-0000-4000-8000-0000000000a1', 0, 'x', 1, 1) $$,
  '42501', null, 'reports에 행을 추가할 수 없다'
);
select throws_ok(
  $$ update public.reports set xp_before = 9999 $$,
  '42501', null, 'reports.xp_before는 바꿀 수 없다'
);
select throws_ok($$ select * from public.quiz_questions $$, '42501', null, 'quiz_questions(정답 포함)는 조회할 수 없다');
select throws_ok($$ select * from public.material_contents $$, '42501', null, 'material_contents는 조회할 수 없다');
select throws_ok($$ select * from public.ai_usage $$, '42501', null, 'ai_usage는 조회할 수 없다');

-- RLS: 다른 사용자의 행

select throws_ok(
  $$ insert into public.sessions (user_id, folder_id, goal)
     values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-0000-4000-8000-0000000000f1', 'B 행세') $$,
  '42501', null, 'user_id를 B로 넣어 세션을 만들 수 없다'
);
select is_empty(
  $$ select id from public.folders where id = 'bbbbbbbb-0000-4000-8000-0000000000f1' $$,
  'A는 B의 폴더를 조회할 수 없다'
);
select is_empty(
  $$ update public.folders set name = '탈취' where id = 'bbbbbbbb-0000-4000-8000-0000000000f1' returning id $$,
  'A는 B의 폴더를 바꿀 수 없다'
);
select is_empty(
  $$ delete from public.folders where id = 'bbbbbbbb-0000-4000-8000-0000000000f1' returning id $$,
  'A는 B의 폴더를 지울 수 없다'
);
select is_empty(
  $$ select id from public.profiles where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' $$,
  'A는 B의 프로필을 조회할 수 없다'
);
select is_empty(
  $$ update public.profiles set display_name = '탈취' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning id $$,
  'A는 B의 프로필을 바꿀 수 없다'
);

-- 로그인 전(anon)

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok($$ select * from public.species $$, '42501', null, 'anon은 동물 목록을 조회할 수 없다');
select throws_ok($$ select * from public.folders $$, '42501', null, 'anon은 폴더를 조회할 수 없다');

reset role;

select results_eq(
  $$ select name from public.folders where id = 'bbbbbbbb-0000-4000-8000-0000000000f1' $$,
  $$ values ('B 폴더') $$,
  'B의 폴더는 그대로다'
);

select * from finish();
rollback;
