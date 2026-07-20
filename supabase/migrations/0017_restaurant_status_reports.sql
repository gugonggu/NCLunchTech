-- 혼잡·영업 상태 제보 (2-3)
-- 참고: .claude/CLAUDE.md 6.3절, 2차 로드맵 2-3 단계

create table restaurant_status_reports (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  employee_id uuid not null references employees (id),
  report_type text not null,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_status_reports_type_check check (report_type in ('congestion', 'business_status')),
  constraint restaurant_status_reports_value_check check (
    (report_type = 'congestion' and value in ('한산', '보통', '혼잡'))
    or (report_type = 'business_status' and value in ('영업 중', '조기 마감', '재료 소진', '임시 휴무'))
  )
);

-- 식당 상세·추천의 "최신 유효 제보" 조회, 관리자의 최근 제보 목록 조회에 쓴다.
create index restaurant_status_reports_restaurant_type_created_idx
  on restaurant_status_reports (restaurant_id, report_type, created_at desc);

-- "내 최근 제보가 수정 허용 창(10분) 이내인지" 판단에 쓴다.
create index restaurant_status_reports_employee_restaurant_type_created_idx
  on restaurant_status_reports (employee_id, restaurant_id, report_type, created_at desc);

alter table restaurant_status_reports enable row level security;
-- 정책을 추가하지 않는다: 서비스 롤 키를 쓰는 서버 코드만 접근 가능하다(기존 테이블과 동일한 패턴).
