-- 기술을 믿어봅니다: 즉시 추천 결과에서 결정한 식당과 실제 방문 완료를 연결한다.
-- 참고: docs 앤시점심기술 미니게임 및 업적 시스템 개발 명세 9.4절(추천 및 월드컵 업적 8.1).

create table if not exists recommendation_selections (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id),
  restaurant_id uuid not null references restaurants (id),
  selected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists recommendation_selections_employee_restaurant_idx
  on recommendation_selections (employee_id, restaurant_id, selected_at);

alter table recommendation_selections enable row level security;
-- 정책을 추가하지 않는다: 서비스 롤 키를 쓰는 서버 코드만 접근 가능하다(기존 테이블과 동일한 패턴).

insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  (
    'FIRST_RECOMMENDATION_VISIT',
    '기술을 믿어봅니다',
    '추천 결과를 실제 점심 선택으로 이어갔습니다.',
    'RECOMMENDATION',
    'COMMON',
    1,
    10,
    false,
    600
  )
on conflict (code) do nothing;
