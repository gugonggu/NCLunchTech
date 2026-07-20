-- 식당·메뉴 투표 (2-1: 약속과 독립된 공유 링크 투표)
-- 참고: .claude/CLAUDE.md 6.1절(식당·메뉴 투표), 2차 로드맵 2-1 단계
-- 약속 연결(appointment_id 등)은 2-2에서 별도 마이그레이션으로 추가한다.

create table polls (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references employees (id),
  poll_type text not null,
  restaurant_id uuid references restaurants (id), -- 메뉴 투표일 때만 채운다(투표 대상 식당).
  status text not null default 'open',
  closes_at timestamptz not null,
  closed_at timestamptz,
  decided_option_id uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint polls_poll_type_check check (poll_type in ('restaurant', 'menu')),
  constraint polls_status_check check (status in ('open', 'closed', 'decided')),
  constraint polls_menu_requires_restaurant_check
    check (poll_type = 'restaurant' or restaurant_id is not null),
  constraint polls_closed_at_check check ((status <> 'open') = (closed_at is not null)),
  constraint polls_decided_check check ((status = 'decided') = (decided_option_id is not null))
);

create index polls_created_by_idx on polls (created_by);
create index polls_status_closes_at_idx on polls (status, closes_at);

create table poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls (id) on delete cascade,
  restaurant_id uuid references restaurants (id),   -- 식당 투표용 선택지
  menu_item_id uuid references menu_items (id),      -- 메뉴 투표용(등록 메뉴) 선택지
  custom_label text,                                 -- 메뉴 투표용(직접 입력) 선택지
  position smallint not null,
  constraint poll_options_one_source_check check (
    (case when restaurant_id is not null then 1 else 0 end
      + case when menu_item_id is not null then 1 else 0 end
      + case when custom_label is not null then 1 else 0 end) = 1
  ),
  constraint poll_options_custom_label_length_check
    check (custom_label is null or char_length(btrim(custom_label)) between 1 and 50)
);

create index poll_options_poll_id_idx on poll_options (poll_id);
-- 같은 투표 안에서 같은 식당/메뉴가 선택지로 중복 등록되는 것을 막는다.
create unique index poll_options_restaurant_unique_idx
  on poll_options (poll_id, restaurant_id) where restaurant_id is not null;
create unique index poll_options_menu_item_unique_idx
  on poll_options (poll_id, menu_item_id) where menu_item_id is not null;

-- decided_option_id는 poll_options를 참조하지만 poll_options가 poll_id로 다시 polls를 참조하므로
-- 순환 참조를 피해 테이블 생성 후 별도로 FK를 건다.
alter table polls
  add constraint polls_decided_option_id_fkey
  foreign key (decided_option_id) references poll_options (id);

create table poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls (id) on delete cascade,
  option_id uuid not null references poll_options (id) on delete cascade,
  employee_id uuid not null references employees (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint poll_votes_unique_per_employee unique (poll_id, employee_id)
);

create index poll_votes_option_id_idx on poll_votes (option_id);

alter table polls enable row level security;
alter table poll_options enable row level security;
alter table poll_votes enable row level security;
-- 정책을 추가하지 않는다: 서비스 롤 키를 쓰는 서버 코드만 접근 가능하다(기존 테이블과 동일한 패턴).
