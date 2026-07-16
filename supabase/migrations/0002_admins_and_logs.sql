-- 관리자(Supabase Auth 연동) 및 관리자 작업 로그
-- 참고: .claude/CLAUDE.md 6절(관리자)

create table if not exists admins (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admins (id) on delete cascade,
  action text not null,
  target_type text,
  target_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_logs_admin_id_idx on admin_logs (admin_id);
create index if not exists admin_logs_created_at_idx on admin_logs (created_at);

alter table admins enable row level security;
alter table admin_logs enable row level security;

-- 정책(policy)을 의도적으로 추가하지 않는다: 서비스 롤 키를 쓰는 서버 코드만 접근 가능하다.

-- 초기 관리자 등록 절차 (Supabase 대시보드에서 Authentication > Users로 계정 생성 후):
-- insert into admins (id, display_name) values ('생성된-auth-user-uuid', '관리자 이름');
