-- 캐릭터는 과목 폴더마다 한 마리다. 경험치와 레벨도 폴더별로만 계산한다(docs/decisions/0003).
-- 캐릭터 테이블을 따로 두지 않고 폴더에 동물을 둔다. 폴더와 캐릭터를 따로 만들면 그 사이에 실패했을 때 캐릭터 없는 폴더가 생기기 때문이다.
--
-- 기존 행에 값을 채우지 않는다. 동물을 임의로 고르지 않기 위해서다. 폴더나 경험치 내역이 이미 있으면 not null 칸을 추가하다 이 마이그레이션이 실패한다.
-- 원격에 반영하기 전에 시험 데이터를 지워 0행으로 만든다(docs/decisions/0003 "반영").

-- 폴더의 동물

alter table public.folders
  add column species_id text not null references public.species (id);

-- 앱은 폴더를 만들 때 동물을 넣을 수 있다. 수정 권한은 name만 그대로 두어 동물은 바꿀 수 없다.
-- 같은 동물을 여러 폴더에서 고를 수 있으므로 unique 제약은 두지 않는다.
grant insert (species_id) on public.folders to authenticated;

drop table public.characters;

-- 폴더별 경험치 내역

alter table public.xp_ledger
  add column folder_id uuid not null;

-- sessions·materials와 같은 이유로 (folder_id, user_id)로 참조한다. service role이 다른 사용자의 폴더에 경험치를 쓰지 못하게 막는다.
-- 폴더를 지우면 그 폴더의 캐릭터가 사라지므로 경험치 내역도 함께 지운다.
alter table public.xp_ledger
  add foreign key (folder_id, user_id) references public.folders (id, user_id) on delete cascade;

-- 포인트 차감처럼 음수로 기록하는 내역이 없어졌다.
alter table public.xp_ledger
  add constraint xp_ledger_amount_check check (amount >= 0);

create index xp_ledger_folder_id_idx on public.xp_ledger (folder_id);

-- 캐릭터(폴더)별 경험치 합계 view
-- 칸이 바뀌어 create or replace로 바꿀 수 없어서 지우고 다시 만든다.
-- security_invoker를 켜야 조회하는 사람의 권한(RLS)으로 folders와 ledger를 읽는다(docs/decisions/0002).

drop view public.character_stats;

create view public.character_stats
with (security_invoker = true)
as
select
  f.id as folder_id,
  f.user_id,
  f.species_id,
  coalesce((select sum(x.amount) from public.xp_ledger x where x.folder_id = f.id), 0)::int as total_xp
from public.folders f;

-- Supabase는 public에 새로 만든 view에 앱 역할 권한을 기본으로 주므로 회수한 뒤 조회만 다시 준다.
revoke all on public.character_stats from anon, authenticated;
grant select on public.character_stats to authenticated;

-- 보상 지급: 세션이 속한 폴더에 경험치를 쌓는다.
-- 인자와 응답은 그대로라 create or replace로 바꾼다. folder_id는 인자로 받지 않고 세션에서 읽어, 서비스가 잘못된 폴더를 넘길 수 없게 한다.
create or replace function server.grant_session_reward(
  p_user_id uuid,
  p_session_id uuid,
  p_xp int,
  p_summary text,
  p_covered_concepts text[],
  p_weak_concepts text[],
  p_duration_seconds int,
  p_turn_count int,
  p_quiz_correct int,
  p_quiz_total int
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
  v_folder_id uuid;
  v_xp_before int;
  v_report_id uuid;
  v_xp int;
begin
  -- ErrorCode가 아닌 메시지라 서비스에서 INTERNAL_ERROR가 된다. 사용자 입력이 아니라 서버 코드의 잘못이기 때문이다.
  if p_xp is null or p_xp < 0 then
    raise exception 'p_xp는 0 이상이어야 한다';
  end if;

  -- 사용자 단위 잠금이라 같은 폴더의 보상 지급도 한 번에 하나씩 처리된다.
  perform server.lock_user(p_user_id);

  select s.status, s.folder_id into v_status, v_folder_id
  from public.sessions s
  where s.id = p_session_id and s.user_id = p_user_id
  for update;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if v_status = 'active' then
    raise exception 'INVALID_STATE';
  end if;

  if v_status = 'finished' then
    select coalesce(sum(x.amount), 0)::int into v_xp_before
    from public.xp_ledger x
    where x.folder_id = v_folder_id;

    insert into public.xp_ledger (user_id, folder_id, amount, reason, session_id)
    values (p_user_id, v_folder_id, p_xp, 'session_reward', p_session_id);

    insert into public.reports (
      session_id, xp_before, summary, covered_concepts, weak_concepts,
      duration_seconds, turn_count, quiz_correct, quiz_total
    )
    values (
      p_session_id, v_xp_before, p_summary, p_covered_concepts, p_weak_concepts,
      p_duration_seconds, p_turn_count, p_quiz_correct, p_quiz_total
    );

    update public.sessions set status = 'reported' where id = p_session_id;
  end if;

  -- 첫 지급과 재요청 모두 저장된 행에서 값을 읽어, 두 응답이 항상 같게 한다.
  select r.id, r.xp_before into v_report_id, v_xp_before
  from public.reports r
  where r.session_id = p_session_id;

  select x.amount into v_xp
  from public.xp_ledger x
  where x.session_id = p_session_id and x.reason = 'session_reward';

  return jsonb_build_object(
    'granted', v_status = 'finished',
    'report_id', v_report_id,
    'xp', v_xp,
    'xp_before', v_xp_before,
    'xp_after', v_xp_before + v_xp
  );
end;
$$;

-- 권한: service_role만
-- create or replace는 기존 권한을 유지하지만, 함수를 바꾸는 마이그레이션은 두 줄을 다시 실행하는 규칙을 한 가지로 지킨다.

revoke execute on all functions in schema server from public, anon, authenticated;
grant execute on all functions in schema server to service_role;
