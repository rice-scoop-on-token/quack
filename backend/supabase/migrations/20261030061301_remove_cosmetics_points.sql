-- 꾸미기(아이템)와 포인트를 MVP에서 뺀다(docs/decisions/0003).
-- 아이템 구조는 캐릭터가 폴더별로 바뀌면 그대로 쓸 수 없어서, 남겨 두지 않고 지운다. 다시 넣을 때는 새로 설계한다.
-- 캐릭터·경험치를 폴더별로 바꾸는 것은 다음 마이그레이션에서 한다. 그때까지 경험치 합계는 사용자 단위다.
--
-- server.lock_user는 그대로 둔다. 같은 사용자의 보상 지급이 동시에 들어와도 지급 전 경험치(xp_before)가 겹치지 않게 하는 데 여전히 필요하다.

-- 서버 함수

drop function server.purchase_item(uuid, text);

-- 인자가 바뀌면 create or replace로 바꿀 수 없어서 지우고 다시 만든다.
drop function server.grant_session_reward(uuid, uuid, int, int, text[], text, text[], text[], int, int, int, int);

-- 세션 보상(경험치)과 리포트를 한 트랜잭션으로 기록한다.
-- supabase-js로는 여러 문장을 묶은 트랜잭션을 실행할 수 없어서 SQL 함수로 만든다.
-- 이미 지급한 세션이면 아무것도 쓰지 않고 처음 지급한 값을 그대로 돌려준다.
create function server.grant_session_reward(
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
  v_xp_before int;
  v_report_id uuid;
  v_xp int;
begin
  -- ErrorCode가 아닌 메시지라 서비스에서 INTERNAL_ERROR가 된다. 사용자 입력이 아니라 서버 코드의 잘못이기 때문이다.
  if p_xp is null or p_xp < 0 then
    raise exception 'p_xp는 0 이상이어야 한다';
  end if;

  perform server.lock_user(p_user_id);

  select s.status into v_status
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
    where x.user_id = p_user_id;

    insert into public.xp_ledger (user_id, amount, reason, session_id)
    values (p_user_id, p_xp, 'session_reward', p_session_id);

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

-- 경험치 합계 view
-- point_ledger를 읽고 있어서 테이블보다 먼저 지우고, 경험치만으로 다시 만든다.
-- security_invoker를 켜야 조회하는 사람의 권한(RLS)으로 ledger를 읽는다(docs/decisions/0002).

drop view public.character_stats;

create view public.character_stats
with (security_invoker = true)
as
select
  p.id as user_id,
  coalesce((select sum(x.amount) from public.xp_ledger x where x.user_id = p.id), 0)::int as total_xp
from public.profiles p;

-- Supabase는 public에 새로 만든 view에 앱 역할 권한을 기본으로 주므로 회수한 뒤 조회만 다시 준다.
revoke all on public.character_stats from anon, authenticated;
grant select on public.character_stats to authenticated;

-- 테이블
-- user_items가 items를 참조하므로 먼저 지운다.

drop table public.user_items;
drop table public.items;
drop table public.point_ledger;

-- 포인트 차감(item_purchase) 사유가 없어졌다.
alter table public.xp_ledger drop constraint xp_ledger_reason_check;
alter table public.xp_ledger add constraint xp_ledger_reason_check check (reason in ('session_reward'));

-- 권한: service_role만
-- 함수를 새로 만들었으므로 두 줄을 다시 실행한다(CLAUDE.md Backend 섹션).

revoke execute on all functions in schema server from public, anon, authenticated;
grant execute on all functions in schema server to service_role;
