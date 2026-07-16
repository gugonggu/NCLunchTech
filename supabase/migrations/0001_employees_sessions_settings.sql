-- 직원 프로필/PIN/세션 및 앱 설정(초대코드) 테이블
-- 참고: .claude/CLAUDE.md 5절(직원 인증), 6절(관리자, app_settings는 이후 확장)

create extension if not exists pgcrypto;

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  nickname text not null unique,
  pin_hash text not null,
  failed_login_count integer not null default 0,
  locked_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  deactivated_at timestamptz
);

create table if not exists employee_sessions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  token_hash text not null unique,
  last_used_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists employee_sessions_employee_id_idx on employee_sessions (employee_id);
create index if not exists employee_sessions_expires_at_idx on employee_sessions (expires_at);

-- 회사 공용 초대코드 등 앱 전역 설정을 담는 단일 행 테이블.
-- company_lat/lng, default_radius_m 등은 식당/추천 단계에서 별도 마이그레이션으로 추가한다.
create table if not exists app_settings (
  id smallint primary key default 1,
  invite_code text not null,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

alter table employees enable row level security;
alter table employee_sessions enable row level security;
alter table app_settings enable row level security;

-- 정책(policy)을 의도적으로 추가하지 않는다.
-- 서비스 롤 키를 사용하는 서버 코드만 이 테이블들에 접근할 수 있고,
-- 브라우저에서 쓰는 anon/authenticated 역할은 RLS에 의해 완전히 차단된다.

-- 적용 후 아래 쿼리로 실제 회사 초대코드를 직접 등록하세요 (비밀 값이므로 이 파일에는 넣지 않습니다):
-- insert into app_settings (id, invite_code) values (1, '실제_초대코드');
