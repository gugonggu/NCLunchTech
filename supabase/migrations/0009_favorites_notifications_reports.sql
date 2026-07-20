-- 즐겨찾기, 내부 알림, 신고(접수만 — 처리는 13단계 관리자 화면에서)
-- 참고: .claude/CLAUDE.md 14절(1차 도감), 17절(내부 알림/신고)

create table favorites (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id),
  restaurant_id uuid not null references restaurants (id),
  created_at timestamptz not null default now(),
  constraint favorites_unique unique (employee_id, restaurant_id)
);

create index favorites_employee_id_idx on favorites (employee_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id),
  type text not null,
  message text not null,
  related_appointment_id uuid references appointments (id),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (type in ('appointment_invited', 'appointment_updated', 'appointment_cancelled'))
);

create index notifications_employee_unread_idx on notifications (employee_id, read_at);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_employee_id uuid not null references employees (id),
  review_id uuid not null references reviews (id),
  reason text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint reports_unique_per_reporter_review unique (reporter_employee_id, review_id),
  constraint reports_status_check check (status in ('pending', 'resolved')),
  constraint reports_reason_length_check check (char_length(reason) <= 200)
);

create index reports_review_id_idx on reports (review_id);

alter table favorites enable row level security;
alter table notifications enable row level security;
alter table reports enable row level security;
-- 정책을 추가하지 않는다: 서비스 롤 키를 쓰는 서버 코드만 접근 가능하다(기존 테이블과 동일한 패턴).
