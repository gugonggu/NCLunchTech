create or replace function public.upsert_settlement(
  p_appointment_id uuid,
  p_created_by uuid,
  p_payer_employee_id uuid,
  p_total_amount integer,
  p_rounding_unit integer,
  p_split_mode text,
  p_rounding_employee_id uuid,
  p_shares jsonb
)
returns table (settlement_id uuid, is_new boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settlement_id uuid;
  v_is_new boolean := false;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_appointment_id::text, 0));

  select id into v_settlement_id
  from settlements
  where appointment_id = p_appointment_id;

  if found then
    update settlements
    set
      payer_employee_id = p_payer_employee_id,
      total_amount = p_total_amount,
      rounding_unit = p_rounding_unit,
      split_mode = p_split_mode,
      rounding_employee_id = p_rounding_employee_id,
      updated_at = now()
    where id = v_settlement_id;
  else
    insert into settlements (
      appointment_id,
      created_by,
      payer_employee_id,
      total_amount,
      rounding_unit,
      split_mode,
      rounding_employee_id
    ) values (
      p_appointment_id,
      p_created_by,
      p_payer_employee_id,
      p_total_amount,
      p_rounding_unit,
      p_split_mode,
      p_rounding_employee_id
    )
    returning id into v_settlement_id;
    v_is_new := true;
  end if;

  delete from settlement_shares where settlement_id = v_settlement_id;

  insert into settlement_shares (settlement_id, employee_id, amount, is_payer)
  select v_settlement_id, share.employee_id, share.amount, share.is_payer
  from jsonb_to_recordset(p_shares) as share(employee_id uuid, amount integer, is_payer boolean);

  return query select v_settlement_id, v_is_new;
end;
$$;

revoke execute on function public.upsert_settlement(uuid, uuid, uuid, integer, integer, text, uuid, jsonb) from public;
revoke execute on function public.upsert_settlement(uuid, uuid, uuid, integer, integer, text, uuid, jsonb) from anon;
revoke execute on function public.upsert_settlement(uuid, uuid, uuid, integer, integer, text, uuid, jsonb) from authenticated;
grant execute on function public.upsert_settlement(uuid, uuid, uuid, integer, integer, text, uuid, jsonb) to service_role;
