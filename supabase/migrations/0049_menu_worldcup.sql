-- 오늘의 메뉴 월드컵: 세션/경기
-- 참고: docs 앤시점심기술 미니게임 및 업적 시스템 개발 명세 4~5절
-- 후보 메뉴는 여러 식당에 걸친 "이름 기준 가상 메뉴"라 menu_items에 FK를 걸지 않고
-- candidate_snapshot(jsonb)에 출전 당시 정보를 그대로 보존한다(재현/재확인 가능해야 하므로).

create table if not exists menu_worldcup_sessions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id),
  status text not null default 'IN_PROGRESS',
  tournament_size smallint not null,
  current_round smallint not null default 1,
  candidate_snapshot jsonb not null,
  winner_menu_key text,
  winner_menu_snapshot jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  abandoned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_worldcup_sessions_status_check check (status in ('IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
  constraint menu_worldcup_sessions_tournament_size_check check (tournament_size in (4, 8)),
  constraint menu_worldcup_sessions_completed_at_check check ((status = 'COMPLETED') = (completed_at is not null)),
  constraint menu_worldcup_sessions_abandoned_at_check check ((status = 'ABANDONED') = (abandoned_at is not null)),
  constraint menu_worldcup_sessions_winner_check check ((status = 'COMPLETED') = (winner_menu_key is not null))
);

-- 직원 1명당 진행 중인 월드컵은 하나만 허용한다(새로 시작하려면 기존 세션을 ABANDONED로 먼저 바꾼다).
create unique index if not exists menu_worldcup_sessions_one_in_progress_idx
  on menu_worldcup_sessions (employee_id)
  where status = 'IN_PROGRESS';

create index if not exists menu_worldcup_sessions_employee_status_idx
  on menu_worldcup_sessions (employee_id, status, created_at);

create table if not exists menu_worldcup_matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references menu_worldcup_sessions (id) on delete cascade,
  round_number smallint not null,
  match_index smallint not null,
  left_menu_key text not null,
  right_menu_key text not null,
  selected_menu_key text,
  selected_at timestamptz,
  created_at timestamptz not null default now(),
  constraint menu_worldcup_matches_unique unique (session_id, round_number, match_index),
  constraint menu_worldcup_matches_selected_at_check check ((selected_menu_key is not null) = (selected_at is not null))
);

create index if not exists menu_worldcup_matches_session_round_idx
  on menu_worldcup_matches (session_id, round_number, match_index);

alter table menu_worldcup_sessions enable row level security;
alter table menu_worldcup_matches enable row level security;
-- 정책을 추가하지 않는다: 서비스 롤 키를 쓰는 서버 코드만 접근 가능하다(기존 테이블과 동일한 패턴).

-- 취향 발견(메뉴 월드컵 첫 완료) 시작 업적.
insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  ('FIRST_WORLDCUP', '취향 발견', '오늘 가장 먹고 싶은 메뉴를 찾아냈습니다.', 'START', 'COMMON', 1, 10, false, 50)
on conflict (code) do nothing;
