-- 직원이 당일 점심 상태를 공개적으로 공유하는 가벼운 참여 기능.
-- 정식 약속, 자동 초대, 관리자 개인 상태 통계는 의도적으로 포함하지 않는다.

create table lunch_availabilities (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  availability_date date not null,
  status text not null check (status in ('looking_for_company', 'has_appointment', 'eating_alone', 'away_or_skipping')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lunch_availabilities_one_per_employee_day unique (employee_id, availability_date)
);

create index lunch_availabilities_date_idx on lunch_availabilities (availability_date);

alter table lunch_availabilities enable row level security;
-- 정책을 추가하지 않는다. 기존 직원 데이터와 같이 서비스 롤 서버 코드만 접근한다.
