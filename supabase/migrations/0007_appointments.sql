-- 동료 초대와 약속(여기로 결정 중 "동료와 함께" 경로)
-- 참고: .claude/CLAUDE.md 7절(핵심 흐름), 12절(여기로 결정과 약속)
-- 개인 방문(visits, 9단계)과는 완전히 독립된 테이블이며 서로 참조하지 않는다.

create table appointments (
  id uuid primary key default gen_random_uuid(),
  host_employee_id uuid not null references employees (id),
  restaurant_id uuid not null references restaurants (id),
  scheduled_at timestamptz not null,
  memo text,
  status text not null default 'active',
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_status_check check (status in ('active', 'cancelled')),
  constraint appointments_cancelled_at_check check ((status = 'cancelled') = (cancelled_at is not null)),
  constraint appointments_memo_length_check check (memo is null or char_length(memo) <= 100)
);

create index appointments_host_employee_id_idx on appointments (host_employee_id);
create index appointments_scheduled_at_idx on appointments (scheduled_at);

-- 참여자(방장은 포함하지 않음, host_employee_id로 별도 관리).
-- 상태: pending(대기) -> accepted(확정)/declined(거절), accepted -> cancelled(불참).
-- "응답 없음"은 저장하지 않고 pending + scheduled_at 경과를 화면에서 계산해 표시한다.
create table appointment_participants (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments (id) on delete cascade,
  employee_id uuid not null references employees (id),
  status text not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_participants_status_check check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  constraint appointment_participants_unique unique (appointment_id, employee_id)
);

create index appointment_participants_employee_id_idx on appointment_participants (employee_id, status);

alter table appointments enable row level security;
alter table appointment_participants enable row level security;
-- 정책을 추가하지 않는다: 서비스 롤 키를 쓰는 서버 코드만 접근 가능하다(기존 테이블과 동일한 패턴).
