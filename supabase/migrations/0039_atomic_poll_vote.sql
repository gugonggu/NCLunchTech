create or replace function public.cast_poll_vote(
  p_poll_id uuid,
  p_option_id uuid,
  p_employee_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_closes_at timestamptz;
  v_had_vote boolean;
begin
  select status, closes_at into v_status, v_closes_at
  from polls
  where id = p_poll_id
  for update;

  if not found then return 'not_found'; end if;
  if v_status <> 'open' then return 'closed'; end if;

  if v_closes_at <= now() then
    update polls set status = 'closed', closed_at = now()
    where id = p_poll_id and status = 'open';
    return 'closed';
  end if;

  if not exists (select 1 from poll_options where poll_id = p_poll_id and id = p_option_id) then
    return 'invalid_option';
  end if;

  select exists (
    select 1 from poll_votes where poll_id = p_poll_id and employee_id = p_employee_id
  ) into v_had_vote;

  insert into poll_votes (poll_id, option_id, employee_id, updated_at)
  values (p_poll_id, p_option_id, p_employee_id, now())
  on conflict (poll_id, employee_id) do update
  set option_id = excluded.option_id, updated_at = excluded.updated_at;

  return case when v_had_vote then 'vote_changed' else 'voted' end;
end;
$$;

revoke execute on function public.cast_poll_vote(uuid, uuid, uuid) from public;
revoke execute on function public.cast_poll_vote(uuid, uuid, uuid) from anon;
revoke execute on function public.cast_poll_vote(uuid, uuid, uuid) from authenticated;
grant execute on function public.cast_poll_vote(uuid, uuid, uuid) to service_role;
