-- 초기 스키마: 테이블, RLS, 칸 단위 권한, character_stats view
-- 필드와 값의 종류는 shared/src/domain.ts와 맞춘다.
--
-- 권한 원칙
-- - 모든 테이블에 RLS를 켠다. RLS는 "어느 행"을 막고, 칸 단위 GRANT는 "어느 칸"을 막는다. 둘을 함께 쓴다.
-- - Supabase는 public 테이블에 anon·authenticated 권한을 기본으로 주므로, 테이블마다 먼저 모두 회수한 뒤 필요한 것만 다시 준다.
-- - 익명 로그인 사용자도 authenticated 역할이다. anon(로그인 전)에는 아무 권한도 주지 않는다.
-- - 서버만 쓰는 테이블은 서버가 service role로 쓴다(CLAUDE.md Backend 섹션).

-- 사용자와 캐릭터

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (display_name <> ''),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.species (
  id text primary key check (id in ('rubber_duck', 'raccoon', 'cat')),
  name text not null check (name <> ''),
  -- AI 페르소나 파일 이름과 맞추기 위해 id와 같은 값을 쓴다.
  persona_key text not null check (persona_key = id),
  description text not null default ''
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  -- 1인 1캐릭터
  user_id uuid not null unique references auth.users (id) on delete cascade,
  species_id text not null references public.species (id),
  created_at timestamptz not null default now()
);

-- 아이템
-- 아이템 데이터(seed)는 획득 방식(D9) 결정 후에 넣는다. unlock 모양은 shared의 D9 추천안과 같다.

create table public.items (
  id text primary key check (id <> ''),
  name text not null check (name <> ''),
  slot text not null check (slot in ('head', 'face', 'body', 'accessory')),
  asset_key text not null check (asset_key <> ''),
  unlock jsonb not null check (
    (unlock ->> 'type' = 'level' and (unlock ->> 'level')::int >= 1)
    or (unlock ->> 'type' = 'points' and (unlock ->> 'price')::int >= 1)
  )
);

create table public.user_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.items (id),
  source text not null check (source in ('reward', 'purchase')),
  equipped boolean not null default false,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- 폴더와 자료

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (name <> ''),
  created_at timestamptz not null default now(),
  -- sessions·materials가 (folder_id, user_id)로 참조하기 위한 제약
  unique (id, user_id)
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  folder_id uuid not null,
  kind text not null check (kind in ('text', 'pdf', 'image')),
  title text not null check (title <> ''),
  storage_path text,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'ready', 'failed')),
  key_concepts text[] not null default '{}',
  error_message text,
  created_at timestamptz not null default now(),
  -- 다른 사용자의 폴더에 자료를 만들 수 없게 한다.
  -- 서버가 service role로 폴더의 자료를 읽을 때 남의 자료가 섞이지 않게 하기 위해서다.
  foreign key (folder_id, user_id) references public.folders (id, user_id) on delete cascade
);

-- 자료에서 추출한 원문. 서버 전용이라 앱 역할에는 권한을 주지 않는다.
create table public.material_contents (
  material_id uuid primary key references public.materials (id) on delete cascade,
  extracted_text text not null,
  extracted_at timestamptz not null default now()
);

-- 세션과 설명

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  folder_id uuid not null,
  goal text not null check (goal <> ''),
  status text not null default 'active' check (status in ('active', 'finished', 'reported')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- materials와 같은 이유로 자기 폴더에만 세션을 만들 수 있게 한다.
  foreign key (folder_id, user_id) references public.folders (id, user_id) on delete cascade
);

create table public.explanation_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  seq int not null check (seq >= 1),
  trigger text not null check (trigger in ('self', 'ai_question', 'follow_up', 're_explain')),
  question_text text,
  input_mode text not null check (input_mode in ('voice', 'chat')),
  text text not null check (text <> ''),
  created_at timestamptz not null default now(),
  unique (session_id, seq)
);

-- 퀴즈와 리포트

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 정답이 들어 있는 문항. 서버 전용이라 앱 역할에는 조회 권한도 주지 않는다. 앱은 API 응답으로만 문항을 받는다.
-- 형식은 팀 결정(D7) 전이라 추천안(객관식 4지선다) 기준이다.
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  seq int not null check (seq >= 1),
  type text not null check (type = 'multiple_choice'),
  prompt text not null check (prompt <> ''),
  choices text[] not null check (cardinality(choices) = 4),
  answer int not null check (answer between 0 and 3),
  explanation text not null,
  related_concept text,
  unique (quiz_id, seq)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  -- 퀴즈 하나에 제출은 한 번
  quiz_id uuid not null unique references public.quizzes (id) on delete cascade,
  answers jsonb not null,
  correct_count int not null check (correct_count >= 0),
  total_count int not null check (total_count >= 0),
  graded_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  -- 세션 하나에 리포트는 하나
  session_id uuid not null unique references public.sessions (id) on delete cascade,
  summary text not null,
  covered_concepts text[] not null default '{}',
  weak_concepts text[] not null default '{}',
  duration_seconds int not null check (duration_seconds >= 0),
  turn_count int not null check (turn_count >= 0),
  quiz_correct int check (quiz_correct >= 0),
  quiz_total int check (quiz_total >= 0),
  created_at timestamptz not null default now()
);

-- 지급 내역과 AI 사용량
-- 경험치·포인트는 값을 덮어쓰지 않고 내역을 쌓는다. 포인트 차감(아이템 구매)은 음수 amount다.

create table public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount int not null,
  reason text not null check (reason in ('session_reward', 'item_purchase')),
  -- 세션이 지워져도 지급 내역(경험치)은 남긴다.
  session_id uuid references public.sessions (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount int not null,
  reason text not null check (reason in ('session_reward', 'item_purchase')),
  session_id uuid references public.sessions (id) on delete set null,
  created_at timestamptz not null default now()
);

-- 세션 보상은 한 번만 지급한다. 코드 확인만으로는 동시에 들어온 두 요청을 막을 수 없어서 DB 제약으로 막는다.
create unique index xp_ledger_session_reward_once
  on public.xp_ledger (session_id) where reason = 'session_reward';
create unique index point_ledger_session_reward_once
  on public.point_ledger (session_id) where reason = 'session_reward';

-- AI 호출 일일 사용량. usage_date는 서울 시간(Asia/Seoul) 기준 날짜다. 서버 전용이다.
create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  kind text not null check (kind in ('analysis', 'ai_question', 'quiz', 'report', 'stt', 'material')),
  count int not null default 0 check (count >= 0),
  primary key (user_id, usage_date, kind)
);

-- 조회 성능용 인덱스 (RLS 조건과 목록 조회에 쓰이는 칸)

create index folders_user_id_idx on public.folders (user_id);
create index materials_folder_id_idx on public.materials (folder_id);
create index sessions_user_id_idx on public.sessions (user_id);
create index sessions_folder_id_idx on public.sessions (folder_id);
create index quizzes_session_id_idx on public.quizzes (session_id);
create index xp_ledger_user_id_idx on public.xp_ledger (user_id);
create index point_ledger_user_id_idx on public.point_ledger (user_id);

-- 경험치·포인트 합계. 레벨은 shared의 levelFromXp로 계산하므로 여기에는 두지 않는다.
-- security_invoker를 켜야 조회하는 사람의 권한(RLS)으로 ledger를 읽는다.
-- 끄면 view 소유자 권한으로 실행되어 다른 사용자의 합계까지 보일 수 있다.
create view public.character_stats
with (security_invoker = true)
as
select
  p.id as user_id,
  coalesce((select sum(x.amount) from public.xp_ledger x where x.user_id = p.id), 0)::int as total_xp,
  coalesce((select sum(pt.amount) from public.point_ledger pt where pt.user_id = p.id), 0)::int as points_balance
from public.profiles p;

-- RLS 켜기

alter table public.profiles enable row level security;
alter table public.species enable row level security;
alter table public.characters enable row level security;
alter table public.items enable row level security;
alter table public.user_items enable row level security;
alter table public.folders enable row level security;
alter table public.materials enable row level security;
alter table public.material_contents enable row level security;
alter table public.sessions enable row level security;
alter table public.explanation_turns enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.reports enable row level security;
alter table public.xp_ledger enable row level security;
alter table public.point_ledger enable row level security;
alter table public.ai_usage enable row level security;

-- 기본 권한 회수

revoke all on
  public.profiles, public.species, public.characters, public.items, public.user_items,
  public.folders, public.materials, public.material_contents,
  public.sessions, public.explanation_turns,
  public.quizzes, public.quiz_questions, public.quiz_attempts, public.reports,
  public.xp_ledger, public.point_ledger, public.ai_usage,
  public.character_stats
from anon, authenticated;

-- 앱 역할(authenticated)에 필요한 권한만 다시 준다.
-- 아래에 없는 칸은 앱이 쓸 수 없다. 예: sessions.status, materials.status, user_items 행 추가

grant select on public.profiles to authenticated;
grant insert (id, display_name) on public.profiles to authenticated;
grant update (display_name, onboarding_completed_at) on public.profiles to authenticated;

grant select on public.species to authenticated;
grant select on public.items to authenticated;

grant select on public.characters to authenticated;
grant insert (user_id, species_id) on public.characters to authenticated;

grant select on public.user_items to authenticated;
grant update (equipped) on public.user_items to authenticated;

grant select, delete on public.folders to authenticated;
grant insert (user_id, name) on public.folders to authenticated;
grant update (name) on public.folders to authenticated;

grant select, delete on public.materials to authenticated;
grant insert (user_id, folder_id, kind, title, storage_path) on public.materials to authenticated;
grant update (title) on public.materials to authenticated;

grant select on public.sessions to authenticated;
grant insert (user_id, folder_id, goal) on public.sessions to authenticated;

grant select on public.explanation_turns to authenticated;
grant select on public.quizzes to authenticated;
grant select on public.quiz_attempts to authenticated;
grant select on public.reports to authenticated;

-- character_stats가 조회하는 사람의 권한으로 ledger를 읽으므로 자기 행 조회는 허용한다. 쓰기는 서버만 한다.
grant select on public.xp_ledger to authenticated;
grant select on public.point_ledger to authenticated;
grant select on public.character_stats to authenticated;

-- material_contents, quiz_questions, ai_usage는 서버 전용이라 권한을 주지 않는다.

-- RLS 정책: 자기 행만
-- auth.uid()를 (select ...)로 감싸면 행마다가 아니라 쿼리마다 한 번만 계산한다.

create policy "자기 프로필 조회" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "자기 프로필 생성" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "자기 프로필 수정" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "동물 목록 조회" on public.species
  for select to authenticated using (true);
create policy "아이템 목록 조회" on public.items
  for select to authenticated using (true);

create policy "자기 캐릭터 조회" on public.characters
  for select to authenticated using (user_id = (select auth.uid()));
create policy "자기 캐릭터 생성" on public.characters
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "자기 아이템 조회" on public.user_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "자기 아이템 장착 변경" on public.user_items
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "자기 폴더 조회" on public.folders
  for select to authenticated using (user_id = (select auth.uid()));
create policy "자기 폴더 생성" on public.folders
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "자기 폴더 수정" on public.folders
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "자기 폴더 삭제" on public.folders
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "자기 자료 조회" on public.materials
  for select to authenticated using (user_id = (select auth.uid()));
create policy "자기 자료 생성" on public.materials
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "자기 자료 수정" on public.materials
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "자기 자료 삭제" on public.materials
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "자기 세션 조회" on public.sessions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "자기 세션 생성" on public.sessions
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "자기 세션의 설명 조회" on public.explanation_turns
  for select to authenticated using (
    exists (select 1 from public.sessions s where s.id = session_id and s.user_id = (select auth.uid()))
  );

create policy "자기 세션의 퀴즈 조회" on public.quizzes
  for select to authenticated using (
    exists (select 1 from public.sessions s where s.id = session_id and s.user_id = (select auth.uid()))
  );

create policy "자기 퀴즈의 제출 조회" on public.quiz_attempts
  for select to authenticated using (
    exists (
      select 1 from public.quizzes q
      join public.sessions s on s.id = q.session_id
      where q.id = quiz_id and s.user_id = (select auth.uid())
    )
  );

create policy "자기 세션의 리포트 조회" on public.reports
  for select to authenticated using (
    exists (select 1 from public.sessions s where s.id = session_id and s.user_id = (select auth.uid()))
  );

create policy "자기 경험치 내역 조회" on public.xp_ledger
  for select to authenticated using (user_id = (select auth.uid()));
create policy "자기 포인트 내역 조회" on public.point_ledger
  for select to authenticated using (user_id = (select auth.uid()));
