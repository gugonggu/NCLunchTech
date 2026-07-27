-- 업적 시스템 1단계: 정의/이벤트/진행도/달성/칭호
-- 참고: docs 업적 기획·개발 명세 (시작 카테고리 중 이번 단계에 실제로 연결하는 3개만 seed)

create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  category text not null,
  tier text not null,
  target_value integer not null default 1,
  point_reward integer not null default 10,
  is_hidden boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint achievements_category_check check (
    category in ('START', 'VISIT', 'EXPLORE', 'RECOMMENDATION', 'WORLDCUP', 'CONTRIBUTION', 'SOCIAL', 'HIDDEN')
  ),
  constraint achievements_tier_check check (tier in ('COMMON', 'INTERMEDIATE', 'ADVANCED', 'SPECIAL')),
  constraint achievements_target_value_check check (target_value > 0),
  constraint achievements_point_reward_check check (point_reward > 0)
);

create index if not exists achievements_category_idx on achievements (category);

-- 칭호 정의. achievement_id가 이 칭호를 해금하는 업적을 가리킨다(업적 쪽에는 역참조 컬럼을 두지 않는다).
create table if not exists titles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  achievement_id uuid not null references achievements (id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists titles_achievement_id_idx on titles (achievement_id);

-- 업적 판정에 사용한 원본 이벤트. event_key unique로 같은 요청이 두 번 들어와도 중복 처리되지 않는다.
create table if not exists achievement_events (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id),
  event_type text not null,
  event_key text not null unique,
  reference_type text,
  reference_id uuid,
  payload jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists achievement_events_employee_event_idx
  on achievement_events (employee_id, event_type, occurred_at);

-- 사용자별 진행도. 목표를 채우기 전까지의 누적 카운트만 캐시하며, 원본 데이터로 재계산 가능해야 한다.
create table if not exists user_achievement_progress (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id),
  achievement_id uuid not null references achievements (id),
  current_value integer not null default 0,
  target_value integer not null,
  progress_data jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint user_achievement_progress_unique unique (employee_id, achievement_id)
);

create index if not exists user_achievement_progress_employee_idx
  on user_achievement_progress (employee_id, achievement_id);

-- 달성 완료. is_new는 아직 달성 알림/목록을 확인하지 않았는지 표시한다.
create table if not exists user_achievements (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id),
  achievement_id uuid not null references achievements (id),
  earned_at timestamptz not null default now(),
  trigger_event_id uuid references achievement_events (id),
  is_new boolean not null default true,
  created_at timestamptz not null default now(),
  constraint user_achievements_unique unique (employee_id, achievement_id)
);

create index if not exists user_achievements_employee_earned_idx
  on user_achievements (employee_id, earned_at);

alter table achievements enable row level security;
alter table titles enable row level security;
alter table achievement_events enable row level security;
alter table user_achievement_progress enable row level security;
alter table user_achievements enable row level security;
-- 정책을 추가하지 않는다: 서비스 롤 키를 쓰는 서버 코드만 접근 가능하다(기존 테이블과 동일한 패턴).

-- 시작 업적 중 이번 단계에서 실제로 이벤트가 연결되는 3개만 등록한다.
-- (혼밥 탈출/취향 발견은 함께 먹기·메뉴 월드컵 이벤트가 아직 없어 다음 단계에서 추가한다.)
insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  ('FIRST_VISIT', '첫 숟가락', '앤시점심기술에서 첫 점심 기록을 남겼습니다.', 'START', 'COMMON', 1, 10, false, 10),
  ('FIRST_RECOMMENDATION', '점심기술 입문자', '점심 결정을 기술에 맡겨보았습니다.', 'START', 'COMMON', 1, 10, false, 20),
  ('FIRST_REVIEW', '기록의 시작', '첫 번째 점심 평가를 남겼습니다.', 'START', 'COMMON', 1, 10, false, 30)
on conflict (code) do nothing;

insert into titles (code, name, description, achievement_id)
select 'FIRST_RECOMMENDATION_TITLE', '점심기술 입문자', '즉시 추천 기능을 처음 사용했습니다.', a.id
from achievements a
where a.code = 'FIRST_RECOMMENDATION'
on conflict (code) do nothing;
