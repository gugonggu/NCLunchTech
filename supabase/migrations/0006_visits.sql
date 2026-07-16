-- 개인 방문(여기로 결정 → 방문 완료/취소) 기록
-- 참고: .claude/CLAUDE.md 7절(핵심 흐름), 12절(여기로 결정, 개인 방문 부분),
--       22절(9번=개인 방문, 11번=방문 확인·리뷰는 이후 단계)

create table visits (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id),
  restaurant_id uuid not null references restaurants (id),
  visit_date date not null,
  status text not null default 'planned',
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visits_status_check check (status in ('planned', 'completed', 'cancelled')),
  constraint visits_completed_at_check check ((status = 'completed') = (completed_at is not null)),
  constraint visits_cancelled_at_check check ((status = 'cancelled') = (cancelled_at is not null))
);

-- 직원 1명당 하루 하나의 활성(planned 또는 completed) 방문만 허용한다.
-- completed 이후에는 같은 날 새 결정을 만들 수 없다(사용자 확정 정책).
create unique index visits_one_active_per_day_idx
  on visits (employee_id, visit_date)
  where status in ('planned', 'completed');

-- 추천 엔진의 "최근 방문 감점"이 조회: 직원별 완료 방문을 visit_date 최근순으로.
create index visits_employee_completed_date_idx
  on visits (employee_id, visit_date desc)
  where status = 'completed';

-- 식당별 방문 기록(도감/관리자 등 이후 단계용)
create index visits_restaurant_id_idx
  on visits (restaurant_id);

alter table visits enable row level security;
-- 정책을 추가하지 않는다: 서비스 롤 키를 쓰는 서버 코드만 접근 가능하다(기존 테이블과 동일한 패턴).
