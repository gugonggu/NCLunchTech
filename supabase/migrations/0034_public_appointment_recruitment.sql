alter table appointments add column is_public boolean not null default false;
alter table appointments add column capacity smallint;

alter table appointments add constraint appointments_public_capacity_check check (
  (is_public = false and capacity is null) or (is_public = true and capacity between 2 and 10)
);

create index appointments_public_recruitment_idx on appointments (scheduled_at)
  where is_public = true and status = 'active';

create or replace function public.approve_public_appointment_applicant(
  p_appointment_id uuid,
  p_participant_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity smallint;
  v_accepted_count integer;
begin
  select capacity into v_capacity
  from appointments
  where id = p_appointment_id
    and is_public = true
    and status = 'active'
    and scheduled_at > now()
  for update;

  if v_capacity is null then
    return false;
  end if;

  select count(*) into v_accepted_count
  from appointment_participants
  where appointment_id = p_appointment_id
    and status = 'accepted';

  if v_accepted_count + 1 >= v_capacity then
    return false;
  end if;

  update appointment_participants
  set status = 'accepted', responded_at = now(), updated_at = now()
  where id = p_participant_id
    and appointment_id = p_appointment_id
    and status = 'pending';

  return found;
end;
$$;

revoke execute on function public.approve_public_appointment_applicant(uuid, uuid) from public;
revoke execute on function public.approve_public_appointment_applicant(uuid, uuid) from anon;
revoke execute on function public.approve_public_appointment_applicant(uuid, uuid) from authenticated;
grant execute on function public.approve_public_appointment_applicant(uuid, uuid) to service_role;
