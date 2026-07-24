alter table settlements add column split_mode text not null default 'equal'
  check (split_mode in ('equal', 'custom'));
alter table settlements add column rounding_employee_id uuid references employees (id);

update settlements set rounding_employee_id = payer_employee_id where split_mode = 'equal';

alter table settlements drop constraint settlements_rounding_unit_check;
alter table settlements add constraint settlements_rounding_unit_check
  check (rounding_unit in (1, 10, 100, 1000));
