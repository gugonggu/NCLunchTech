-- 우승 메뉴 실행력: 월드컵 결과 화면에서 결정한 식당과 실제 방문 완료를 연결한다.
-- 참고: docs 앤시점심기술 미니게임 및 업적 시스템 개발 명세 9.4절.
-- 선택 자체가 당일 17:00 KST 이전이어야 하므로(서버에서 그 시점에만 insert), 이 테이블에
-- 행이 존재한다는 것 자체가 "유효 시간 내 선택"임을 뜻한다.

create table if not exists worldcup_winner_selections (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id),
  worldcup_session_id uuid not null references menu_worldcup_sessions (id),
  restaurant_id uuid not null references restaurants (id),
  selected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists worldcup_winner_selections_employee_restaurant_idx
  on worldcup_winner_selections (employee_id, restaurant_id, selected_at);

alter table worldcup_winner_selections enable row level security;
-- 정책을 추가하지 않는다: 서비스 롤 키를 쓰는 서버 코드만 접근 가능하다(기존 테이블과 동일한 패턴).

insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  (
    'WORLDCUP_WINNER_VISIT_5',
    '우승 메뉴 실행력',
    '토너먼트 결과를 실제 점심으로 이어갔습니다.',
    'WORLDCUP',
    'SPECIAL',
    5,
    30,
    false,
    630
  )
on conflict (code) do nothing;
