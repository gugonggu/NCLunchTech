-- 메뉴·가격, 영업시간, 변경 이력
-- 참고: .claude/CLAUDE.md 10절(식당 상세와 공동 편집)

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  price integer,
  is_sold_out boolean not null default false,
  created_by uuid references employees (id),
  updated_by uuid references employees (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_items_price_check check (price is null or price >= 0)
);

create index if not exists menu_items_restaurant_id_idx on menu_items (restaurant_id);

create table if not exists restaurant_hours (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  day_of_week smallint not null,
  open_time time,
  close_time time,
  break_start time,
  break_end time,
  is_closed boolean not null default false,
  updated_by uuid references employees (id),
  updated_at timestamptz not null default now(),
  constraint restaurant_hours_day_check check (day_of_week between 0 and 6),
  constraint restaurant_hours_unique unique (restaurant_id, day_of_week)
);

-- 등록자·수정자·변경 이력 보존 (범용: 다른 엔티티에도 재사용)
create table if not exists change_history (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  changed_by uuid references employees (id),
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists change_history_entity_idx on change_history (entity_type, entity_id);

alter table menu_items enable row level security;
alter table restaurant_hours enable row level security;
alter table change_history enable row level security;
-- 정책을 추가하지 않는다: 서비스 롤 키를 쓰는 서버 코드만 접근 가능하다.
