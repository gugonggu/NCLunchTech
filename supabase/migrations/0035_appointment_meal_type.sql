alter table appointments
  add column meal_type text not null default 'dine_in',
  add constraint appointments_meal_type_check check (meal_type in ('dine_in', 'delivery'));
