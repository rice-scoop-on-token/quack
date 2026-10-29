-- 서버용 SQL 함수: 보상 지급, AI 사용량 차감, 아이템 구매
--
-- 권한 원칙 (CLAUDE.md Backend 섹션)
-- - 함수는 server 스키마에 두고, 스키마 USAGE와 함수 EXECUTE는 service_role에만 준다.
-- - Postgres는 함수 실행 권한을 기본으로 모두(PUBLIC)에게 주므로 직접 회수한다.
-- - Edge Function이 supabase-js의 .rpc()로 부르려면 Data API에 노출해야 해서 config.toml [api] schemas에 server를 넣었다.
--   앱 역할은 스키마와 함수 두 단계에서 거절된다.
-- - 함수는 security invoker(기본값)다. 호출하는 service_role이 원래 테이블 권한을 가지고 있어서 definer가 필요 없다.
-- - 에러는 shared ErrorCode 문자열을 메시지로 raise한다. 서비스가 이 메시지를 AppError로 바꾼다.

-- 재요청 때도 첫 응답과 같은 보상을 돌려주기 위한 칸

-- 보상으로 받은 아이템이 어느 세션에서 왔는지. 구매한 아이템은 null이다.
alter table public.user_items
  add column session_id uuid references public.sessions (id) on delete set null;

create index user_items_session_id_idx on public.user_items (session_id);

-- 지급 직전의 경험치 합계. 나중에 경험치를 쌓는 다른 경로가 생겨도 지급 당시 레벨을 다시 계산할 수 있게 기록해 둔다.
-- shared reportSchema에는 없어서 API 응답에서는 respond가 걸러낸다.
alter table public.reports
  add column xp_before int not null check (xp_before >= 0);

-- user_items의 앱 권한은 5-1의 칸 단위 GRANT(equipped만 수정)가 그대로 적용되어 session_id는 앱이 쓸 수 없다.

create schema server;

-- 같은 사용자의 보상 지급과 아이템 구매를 한 번에 하나씩 처리하기 위한 잠금이다. 트랜잭션이 끝나면 풀린다.
-- 잠금이 없으면 동시에 들어온 두 구매가 같은 잔액을 보고 둘 다 통과할 수 있다.
create function server.lock_user(p_user_id uuid)
returns void
language sql
set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
$$;

-- AI·STT 호출 직전에 오늘(서울 시간) 사용량을 1 올린다. 이미 한도에 닿았으면 올리지 않고 false를 돌려준다.
-- 확인과 증가를 한 문장으로 해서 동시에 들어온 요청이 함께 한도를 넘지 못하게 한다.
create function server.consume_ai_quota(p_user_id uuid, p_kind text, p_daily_limit int)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_counted boolean;
begin
  if p_daily_limit is null or p_daily_limit < 1 then
    return false;
  end if;

  insert into public.ai_usage as u (user_id, usage_date, kind, count)
  values (p_user_id, (now() at time zone 'Asia/Seoul')::date, p_kind, 1)
  on conflict (user_id, usage_date, kind)
  do update set count = u.count + 1
  where u.count < p_daily_limit
  returning true into v_counted;

  return coalesce(v_counted, false);
end;
$$;

-- 세션 보상(경험치, 포인트, 아이템)과 리포트를 한 트랜잭션으로 기록한다.
-- supabase-js로는 여러 문장을 묶은 트랜잭션을 실행할 수 없어서 SQL 함수로 만든다.
-- 이미 지급한 세션이면 아무것도 쓰지 않고 처음 지급한 값을 그대로 돌려준다.
create function server.grant_session_reward(
  p_user_id uuid,
  p_session_id uuid,
  p_xp int,
  p_points int,
  p_item_ids text[],
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
  v_points int;
  v_item_ids text[];
begin
  -- ErrorCode가 아닌 메시지라 서비스에서 INTERNAL_ERROR가 된다. 사용자 입력이 아니라 서버 코드의 잘못이기 때문이다.
  if p_xp is null or p_xp < 0 or p_points is null or p_points < 0 then
    raise exception 'p_xp와 p_points는 0 이상이어야 한다';
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

    insert into public.point_ledger (user_id, amount, reason, session_id)
    values (p_user_id, p_points, 'session_reward', p_session_id);

    -- 이미 가진 아이템은 건너뛴다. 이 세션에서 새로 받은 아이템만 session_id가 기록된다.
    insert into public.user_items (user_id, item_id, source, session_id)
    select p_user_id, item_id, 'reward', p_session_id
    from unnest(coalesce(p_item_ids, '{}')) as item_id
    on conflict (user_id, item_id) do nothing;

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

  select pt.amount into v_points
  from public.point_ledger pt
  where pt.session_id = p_session_id and pt.reason = 'session_reward';

  select coalesce(array_agg(ui.item_id order by ui.item_id), '{}') into v_item_ids
  from public.user_items ui
  where ui.session_id = p_session_id;

  return jsonb_build_object(
    'granted', v_status = 'finished',
    'report_id', v_report_id,
    'xp', v_xp,
    'points', v_points,
    'xp_before', v_xp_before,
    'xp_after', v_xp_before + v_xp,
    'item_ids', to_jsonb(v_item_ids)
  );
end;
$$;

-- 포인트 확인, 차감, 아이템 추가를 한 트랜잭션으로 처리한다.
create function server.purchase_item(p_user_id uuid, p_item_id text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_unlock jsonb;
  v_price int;
  v_balance int;
  v_user_item public.user_items;
begin
  perform server.lock_user(p_user_id);

  select i.unlock into v_unlock
  from public.items i
  where i.id = p_item_id;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  -- 레벨로 얻는 아이템은 살 수 없다.
  if v_unlock ->> 'type' <> 'points' then
    raise exception 'INVALID_STATE';
  end if;

  v_price := (v_unlock ->> 'price')::int;

  if exists (
    select 1 from public.user_items ui
    where ui.user_id = p_user_id and ui.item_id = p_item_id
  ) then
    raise exception 'ALREADY_OWNED';
  end if;

  select coalesce(sum(pt.amount), 0)::int into v_balance
  from public.point_ledger pt
  where pt.user_id = p_user_id;

  if v_balance < v_price then
    raise exception 'INSUFFICIENT_POINTS';
  end if;

  insert into public.point_ledger (user_id, amount, reason)
  values (p_user_id, -v_price, 'item_purchase');

  insert into public.user_items (user_id, item_id, source)
  values (p_user_id, p_item_id, 'purchase')
  returning * into v_user_item;

  return jsonb_build_object(
    'user_item', to_jsonb(v_user_item),
    'points_balance', v_balance - v_price
  );
end;
$$;

-- 권한: service_role만

grant usage on schema server to service_role;

-- 이 문장은 지금 있는 함수에만 적용된다. 이 스키마에 함수를 추가하는 마이그레이션은 아래 두 줄을 다시 실행해야 한다.
-- 스키마 단위 alter default privileges로는 PUBLIC 실행 권한을 회수할 수 없다(Postgres 전체 기본값이라서).
-- 빠뜨려도 앱 역할은 server 스키마 USAGE가 없어 호출할 수 없지만, 권한을 두 겹으로 유지하기 위해 지킨다.
revoke execute on all functions in schema server from public, anon, authenticated;
grant execute on all functions in schema server to service_role;
