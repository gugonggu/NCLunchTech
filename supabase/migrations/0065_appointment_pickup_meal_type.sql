alter table appointments drop constraint appointments_meal_type_check;

alter table appointments
  add constraint appointments_meal_type_check
  check (meal_type in ('dine_in', 'delivery', 'pickup'));
