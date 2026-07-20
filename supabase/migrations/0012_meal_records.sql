-- 완료된 개인 방문 또는 약속의 실제 메뉴·지불 가격 스냅샷

create table meal_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id),
  restaurant_id uuid not null references restaurants (id),
  visit_id uuid references visits (id) on delete cascade,
  appointment_id uuid references appointments (id) on delete cascade,
  menu_item_id uuid references menu_items (id) on delete set null,
  menu_name_snapshot text not null,
  paid_price integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_records_one_source_check
    check ((visit_id is not null) <> (appointment_id is not null)),
  constraint meal_records_menu_name_check
    check (char_length(btrim(menu_name_snapshot)) between 1 and 100),
  constraint meal_records_paid_price_check
    check (paid_price between 0 and 10000000)
);

create unique index meal_records_visit_unique_idx on meal_records (visit_id) where visit_id is not null;
create unique index meal_records_employee_appointment_unique_idx
  on meal_records (employee_id, appointment_id) where appointment_id is not null;
create index meal_records_employee_created_idx on meal_records (employee_id, created_at desc);
create index meal_records_restaurant_id_idx on meal_records (restaurant_id);

alter table meal_records enable row level security;
-- 앱은 기존 테이블과 동일하게 service role을 사용하는 서버 코드에서만 접근한다.
