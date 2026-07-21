-- N빵 정산 (2차 추가 기능)
-- 완료된 "함께 먹기" 약속의 실제 참석자를 대상으로 한 단순 균등 분할 정산.
-- 송금·계좌 연결·복수 결제자·개인별 금액 분리는 의도적으로 지원하지 않는다.

create table settlements (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments (id) on delete cascade,
  created_by uuid not null references employees (id),
  payer_employee_id uuid not null references employees (id),
  total_amount integer not null check (total_amount > 0 and total_amount <= 10000000),
  rounding_unit integer not null check (rounding_unit in (1, 10, 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 약속 하나당 정산은 하나만 둔다(수정은 upsert로 처리, 등록/수정을 구분해 다른 알림을 보낸다).
  constraint settlements_one_per_appointment unique (appointment_id)
);

-- 정산 시점의 참석자별 부담액 스냅샷(참석자가 나중에 바뀌어도 과거 정산 내역은 그대로 보존).
create table settlement_shares (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references settlements (id) on delete cascade,
  employee_id uuid not null references employees (id),
  amount integer not null check (amount >= 0),
  is_payer boolean not null default false,
  constraint settlement_shares_unique unique (settlement_id, employee_id)
);

create index settlement_shares_settlement_id_idx on settlement_shares (settlement_id);

alter table settlements enable row level security;
alter table settlement_shares enable row level security;
-- 정책을 추가하지 않는다: 서비스 롤 키를 쓰는 서버 코드만 접근 가능하다(기존 테이블과 동일한 패턴).

-- 정산 등록/변경 알림 타입 추가
alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'appointment_invited',
    'appointment_updated',
    'appointment_cancelled',
    'poll_invited',
    'review_commented',
    'poll_closed',
    'poll_decided',
    'report_resolved',
    'settlement_created',
    'settlement_updated'
  ));
