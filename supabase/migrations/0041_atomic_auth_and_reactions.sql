create or replace function public.record_employee_login_attempt(
  p_employee_id uuid,
  p_succeeded boolean
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_failed_login_count integer;
  v_locked_until timestamptz;
  v_next_failed_login_count integer;
begin
  select failed_login_count, locked_until
  into v_failed_login_count, v_locked_until
  from employees
  where id = p_employee_id
  for update;

  if not found then
    raise exception 'employee not found' using errcode = 'P0002';
  end if;

  if v_locked_until is not null and v_locked_until > now() then
    return 'locked';
  end if;

  if p_succeeded then
    update employees
    set failed_login_count = 0, locked_until = null
    where id = p_employee_id;
    return 'succeeded';
  end if;

  v_next_failed_login_count := case
    when v_locked_until is not null then 1
    else v_failed_login_count + 1
  end;

  update employees
  set failed_login_count = v_next_failed_login_count,
      locked_until = case when v_next_failed_login_count >= 5 then now() + interval '10 minutes' else null end
  where id = p_employee_id;

  return case when v_next_failed_login_count >= 5 then 'locked' else 'failed' end;
end;
$$;

create or replace function public.toggle_favorite(
  p_employee_id uuid,
  p_restaurant_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_employee_id::text || ':' || p_restaurant_id::text, 0));

  if exists (select 1 from favorites where employee_id = p_employee_id and restaurant_id = p_restaurant_id) then
    delete from favorites where employee_id = p_employee_id and restaurant_id = p_restaurant_id;
    return false;
  end if;

  insert into favorites (employee_id, restaurant_id) values (p_employee_id, p_restaurant_id);
  return true;
end;
$$;

create or replace function public.toggle_review_reaction(
  p_employee_id uuid,
  p_review_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_employee_id::text || ':' || p_review_id::text, 0));

  if exists (select 1 from review_reactions where employee_id = p_employee_id and review_id = p_review_id) then
    delete from review_reactions where employee_id = p_employee_id and review_id = p_review_id;
    return false;
  end if;

  insert into review_reactions (employee_id, review_id) values (p_employee_id, p_review_id);
  return true;
end;
$$;

revoke all on function public.record_employee_login_attempt(uuid, boolean) from public, anon, authenticated;
revoke all on function public.toggle_favorite(uuid, uuid) from public, anon, authenticated;
revoke all on function public.toggle_review_reaction(uuid, uuid) from public, anon, authenticated;
grant execute on function public.record_employee_login_attempt(uuid, boolean) to service_role;
grant execute on function public.toggle_favorite(uuid, uuid) to service_role;
grant execute on function public.toggle_review_reaction(uuid, uuid) to service_role;
