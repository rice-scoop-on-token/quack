-- 설명 턴의 AI 분석 결과와 AI 발화 저장 (docs/Todo.md A2 최소안)
--
-- - 턴 하나에 분석 하나다. AI가 실패하면 턴도 분석도 저장하지 않으므로, 두 행은 server.save_turn으로 함께 넣는다.
-- - 앱이 읽을 칸(공개 상태 3종, AI 발화)과 서버만 읽을 칸(내부 분석 전체, 모델)을 칸 단위 GRANT로 나눈다.
--   내부 분석에는 판단 근거·누락·오류 목록이 있다. 앱은 supabase-js로 지난 기록을 직접 조회하므로 칸 권한으로 막는다.
-- - 다음 턴을 분석할 때 서버는 이 테이블의 message·question을 이전 대화로 쓴다. 앱이 보낸 question_text는 기록용이다.

create table public.turn_analyses (
  turn_id uuid primary key references public.explanation_turns (id) on delete cascade,
  -- 공개 칸: shared explanationAnalysisSchema와 같은 값
  answer_status text not null check (answer_status in ('correct', 'incorrect', 'not_applicable', 'unverified')),
  understanding_status text not null check (understanding_status in ('sufficient', 'insufficient', 'ambiguous', 'unverified')),
  independent_performance_status text not null check (independent_performance_status in ('confirmed', 'unverified')),
  action text not null check (action in ('ask', 'explain', 'correct', 'acknowledge')),
  message text not null check (btrim(message) <> ''),
  question text check (btrim(question) <> ''),
  -- 서버 전용 칸: AI 출력 전체(_ai/schemas.ts 형식)와 그 출력을 만든 모델. 리포트·퀴즈·보상의 재료다.
  analysis jsonb not null,
  model text not null check (model <> ''),
  created_at timestamptz not null default now(),
  -- 질문하는 행동(ask, explain)에만 질문이 있다. 다음 턴의 이전 대화를 만들 때 이 짝이 맞아야 한다.
  check ((action in ('ask', 'explain')) = (question is not null))
);

alter table public.turn_analyses enable row level security;

-- Supabase는 public에 새로 만든 테이블에 앱 역할 권한을 기본으로 주므로 회수한 뒤 필요한 칸만 다시 준다.
-- 다른 테이블과 달리 조회도 칸 단위다. 그래서 앱이 select=*로 조회하면 권한 오류가 나고, 칸 이름을 적어야 한다.
revoke all on public.turn_analyses from anon, authenticated;
grant select (
  turn_id, answer_status, understanding_status, independent_performance_status,
  action, message, question, created_at
) on public.turn_analyses to authenticated;

create policy "자기 세션의 분석 조회" on public.turn_analyses
  for select to authenticated using (
    exists (
      select 1
      from public.explanation_turns t
      join public.sessions s on s.id = t.session_id
      where t.id = turn_id and s.user_id = (select auth.uid())
    )
  );

-- 설명 턴과 분석을 한 트랜잭션으로 저장하고, 저장한 턴 행을 돌려준다.
-- supabase-js로는 두 테이블에 함께 쓰는 트랜잭션을 실행할 수 없어서 SQL 함수로 만든다.
--
-- p_seq는 서비스가 이전 대화를 읽을 때 정한 다음 순번이다. 지금 마지막 순번 + 1이 아니면 INVALID_STATE를 낸다.
-- 그 사이 다른 요청이 턴을 저장했다면, 이 분석은 그 턴을 보지 못하고 만든 것이라 저장하지 않는다(동시 제출).
create function server.save_turn(
  p_user_id uuid,
  p_session_id uuid,
  p_seq int,
  p_trigger text,
  p_question_text text,
  p_input_mode text,
  p_text text,
  p_answer_status text,
  p_understanding_status text,
  p_independent_performance_status text,
  p_action text,
  p_message text,
  p_question text,
  p_analysis jsonb,
  p_model text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
  v_last_seq int;
  v_turn public.explanation_turns;
begin
  -- 세션 행을 잠가 같은 세션의 저장과 세션 종료가 한 번에 하나씩 처리되게 한다.
  select s.status into v_status
  from public.sessions s
  where s.id = p_session_id and s.user_id = p_user_id
  for update;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if v_status <> 'active' then
    raise exception 'INVALID_STATE';
  end if;

  select coalesce(max(t.seq), 0) into v_last_seq
  from public.explanation_turns t
  where t.session_id = p_session_id;

  if p_seq is distinct from v_last_seq + 1 then
    raise exception 'INVALID_STATE';
  end if;

  insert into public.explanation_turns (session_id, seq, trigger, question_text, input_mode, text)
  values (p_session_id, p_seq, p_trigger, p_question_text, p_input_mode, p_text)
  returning * into v_turn;

  insert into public.turn_analyses (
    turn_id, answer_status, understanding_status, independent_performance_status,
    action, message, question, analysis, model
  )
  values (
    v_turn.id, p_answer_status, p_understanding_status, p_independent_performance_status,
    p_action, p_message, p_question, p_analysis, p_model
  );

  return to_jsonb(v_turn);
end;
$$;

-- 권한: service_role만
-- 이 스키마에 함수를 추가했으므로 회수·부여 두 줄을 다시 실행한다(CLAUDE.md Backend 섹션).

revoke execute on all functions in schema server from public, anon, authenticated;
grant execute on all functions in schema server to service_role;
