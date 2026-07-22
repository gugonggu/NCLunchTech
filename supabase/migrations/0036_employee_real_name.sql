alter table employees
  add column if not exists real_name text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employees_real_name_length_check'
      and conrelid = 'employees'::regclass
  ) then
    alter table employees
      add constraint employees_real_name_length_check
      check (real_name is null or char_length(btrim(real_name)) between 2 and 30);
  end if;
end $$;
