-- 관리자 복합 쓰기를 데이터 변경 + 감사 로그 단위의 단일 트랜잭션으로 처리한다.

create or replace function public.admin_reset_employee_pin(
  p_admin_id uuid,
  p_employee_id uuid,
  p_pin_hash text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.admins where id = p_admin_id) then
    raise exception 'admin not found' using errcode = '42501';
  end if;
  if p_pin_hash is null or p_pin_hash = '' then
    raise exception 'pin hash is required' using errcode = '22023';
  end if;

  update public.employees
  set pin_hash = p_pin_hash,
      failed_login_count = 0,
      locked_until = null
  where id = p_employee_id;

  if not found then
    return 'target_not_found';
  end if;

  update public.employee_sessions
  set revoked_at = now()
  where employee_id = p_employee_id
    and revoked_at is null;

  insert into public.admin_logs (admin_id, action, target_type, target_id)
  values (p_admin_id, 'reset_employee_pin', 'employee', p_employee_id);

  return 'pin_reset';
end;
$$;

create or replace function public.admin_set_employee_active(
  p_admin_id uuid,
  p_employee_id uuid,
  p_is_active boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.admins where id = p_admin_id) then
    raise exception 'admin not found' using errcode = '42501';
  end if;

  update public.employees
  set is_active = p_is_active,
      deactivated_at = case when p_is_active then null else now() end
  where id = p_employee_id;

  if not found then
    return 'target_not_found';
  end if;

  if not p_is_active then
    update public.employee_sessions
    set revoked_at = now()
    where employee_id = p_employee_id
      and revoked_at is null;
  end if;

  insert into public.admin_logs (admin_id, action, target_type, target_id)
  values (
    p_admin_id,
    case when p_is_active then 'reactivate_employee' else 'deactivate_employee' end,
    'employee',
    p_employee_id
  );

  return case when p_is_active then 'reactivated' else 'deactivated' end;
end;
$$;

create or replace function public.admin_dismiss_report(
  p_admin_id uuid,
  p_report_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report_id uuid;
begin
  if not exists (select 1 from public.admins where id = p_admin_id) then
    raise exception 'admin not found' using errcode = '42501';
  end if;

  select id into v_report_id
  from public.reports
  where id = p_report_id
    and status = 'pending'
  for update;

  if v_report_id is null then
    return 'target_not_found';
  end if;

  update public.reports
  set status = 'resolved'
  where id = v_report_id;

  insert into public.admin_logs (admin_id, action, target_type, target_id)
  values (p_admin_id, 'dismiss_report', 'report', v_report_id);

  return 'dismissed';
end;
$$;

create or replace function public.admin_delete_reported_review(
  p_admin_id uuid,
  p_report_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review_id uuid;
  v_review_snapshot jsonb;
begin
  if not exists (select 1 from public.admins where id = p_admin_id) then
    raise exception 'admin not found' using errcode = '42501';
  end if;

  select review.id, to_jsonb(review)
  into v_review_id, v_review_snapshot
  from public.reports report
  join public.reviews review on review.id = report.review_id
  where report.id = p_report_id
    and report.status = 'pending'
  for update of report, review;

  if v_review_id is null then
    return jsonb_build_object('status', 'target_not_found');
  end if;

  delete from public.reports where review_id = v_review_id;
  delete from public.reviews where id = v_review_id;

  if not found then
    raise exception 'review disappeared during deletion' using errcode = 'P0002';
  end if;

  insert into public.admin_logs (admin_id, action, target_type, target_id, detail)
  values (
    p_admin_id,
    'delete_reported_review',
    'review',
    v_review_id,
    jsonb_build_object('deletedReview', v_review_snapshot, 'viaReportId', p_report_id)
  );

  return jsonb_build_object('status', 'review_deleted', 'reviewId', v_review_id);
end;
$$;

create or replace function public.admin_apply_csv_batch(
  p_admin_id uuid,
  p_batch_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch record;
  v_row jsonb;
  v_restaurant_id uuid;
  v_menu_name text;
  v_price integer;
  v_day_of_week smallint;
  v_is_closed boolean;
  v_open_time time;
  v_close_time time;
  v_applied_count integer := 0;
begin
  if not exists (select 1 from public.admins where id = p_admin_id) then
    raise exception 'admin not found' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('admin_apply_csv_batch', 0));

  select id, type, status, rows
  into v_batch
  from public.csv_import_batches
  where id = p_batch_id
  for update;

  if not found then
    return jsonb_build_object('status', 'batch_not_found');
  end if;
  if v_batch.status = 'applied' then
    return jsonb_build_object('status', 'already_applied');
  end if;
  if jsonb_typeof(v_batch.rows) <> 'array' then
    raise exception 'invalid csv batch rows' using errcode = '22023';
  end if;

  for v_row in select value from jsonb_array_elements(v_batch.rows)
  loop
    if jsonb_typeof(v_row) <> 'object' or jsonb_typeof(v_row -> 'errors') <> 'array' then
      raise exception 'invalid csv batch row' using errcode = '22023';
    end if;

    if v_row -> 'errors' = '[]'::jsonb then
      v_restaurant_id := (v_row ->> 'restaurantId')::uuid;
      if not exists (select 1 from public.restaurants where id = v_restaurant_id) then
        raise exception 'csv restaurant not found' using errcode = '23503';
      end if;

      if v_batch.type = 'menu' then
        v_menu_name := btrim(v_row ->> 'name');
        if v_menu_name is null or v_menu_name = '' then
          raise exception 'invalid menu name' using errcode = '22023';
        end if;
        v_price := case when jsonb_typeof(v_row -> 'price') = 'null' then null else (v_row ->> 'price')::integer end;

        update public.menu_items
        set price = v_price,
            updated_at = now()
        where restaurant_id = v_restaurant_id
          and name = v_menu_name;

        if not found then
          insert into public.menu_items (restaurant_id, name, price)
          values (v_restaurant_id, v_menu_name, v_price);
        end if;
      elsif v_batch.type = 'hours' then
        v_day_of_week := (v_row ->> 'dayOfWeek')::smallint;
        v_is_closed := (v_row ->> 'isClosed')::boolean;
        v_open_time := case when v_row ->> 'openTime' is null then null else (v_row ->> 'openTime')::time end;
        v_close_time := case when v_row ->> 'closeTime' is null then null else (v_row ->> 'closeTime')::time end;

        insert into public.restaurant_hours (
          restaurant_id, day_of_week, is_closed, open_time, close_time, updated_at
        ) values (
          v_restaurant_id, v_day_of_week, v_is_closed, v_open_time, v_close_time, now()
        )
        on conflict (restaurant_id, day_of_week) do update
        set is_closed = excluded.is_closed,
            open_time = excluded.open_time,
            close_time = excluded.close_time,
            updated_at = excluded.updated_at;
      else
        raise exception 'invalid csv batch type' using errcode = '22023';
      end if;

      v_applied_count := v_applied_count + 1;
    end if;
  end loop;

  if v_applied_count = 0 then
    return jsonb_build_object('status', 'no_valid_rows');
  end if;

  update public.csv_import_batches
  set status = 'applied',
      applied_at = now()
  where id = p_batch_id
    and status = 'pending';

  if not found then
    raise exception 'csv batch state changed' using errcode = '40001';
  end if;

  insert into public.admin_logs (admin_id, action, target_type, target_id, detail)
  values (
    p_admin_id,
    'apply_csv_batch',
    'csv_import_batch',
    p_batch_id,
    jsonb_build_object('type', v_batch.type, 'appliedCount', v_applied_count)
  );

  return jsonb_build_object(
    'status', 'applied',
    'type', v_batch.type,
    'appliedCount', v_applied_count
  );
end;
$$;

revoke all on function public.admin_reset_employee_pin(uuid, uuid, text) from public;
revoke all on function public.admin_reset_employee_pin(uuid, uuid, text) from anon;
revoke all on function public.admin_reset_employee_pin(uuid, uuid, text) from authenticated;
grant execute on function public.admin_reset_employee_pin(uuid, uuid, text) to service_role;

revoke all on function public.admin_set_employee_active(uuid, uuid, boolean) from public;
revoke all on function public.admin_set_employee_active(uuid, uuid, boolean) from anon;
revoke all on function public.admin_set_employee_active(uuid, uuid, boolean) from authenticated;
grant execute on function public.admin_set_employee_active(uuid, uuid, boolean) to service_role;

revoke all on function public.admin_dismiss_report(uuid, uuid) from public;
revoke all on function public.admin_dismiss_report(uuid, uuid) from anon;
revoke all on function public.admin_dismiss_report(uuid, uuid) from authenticated;
grant execute on function public.admin_dismiss_report(uuid, uuid) to service_role;

revoke all on function public.admin_delete_reported_review(uuid, uuid) from public;
revoke all on function public.admin_delete_reported_review(uuid, uuid) from anon;
revoke all on function public.admin_delete_reported_review(uuid, uuid) from authenticated;
grant execute on function public.admin_delete_reported_review(uuid, uuid) to service_role;

revoke all on function public.admin_apply_csv_batch(uuid, uuid) from public;
revoke all on function public.admin_apply_csv_batch(uuid, uuid) from anon;
revoke all on function public.admin_apply_csv_batch(uuid, uuid) from authenticated;
grant execute on function public.admin_apply_csv_batch(uuid, uuid) to service_role;
