-- 관리자 기능 확장: 추천 제외, 공지, CSV 업로드 배치(검증 결과 임시 저장)
-- 참고: .claude/CLAUDE.md 15절(초기 데이터), 16절(관리자 기능)

alter table restaurants add column excluded_from_recommend boolean not null default false;
alter table app_settings add column announcement text;

-- CSV 업로드는 파싱·검증 결과를 먼저 이 테이블에 저장해두고, 관리자가 미리보기를 확인한 뒤
-- "반영" 버튼으로 배치 id를 참조해 실제 반영한다(대용량 파일도 안전하게 처리하기 위함).
create table csv_import_batches (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admins (id),
  type text not null,
  status text not null default 'pending',
  rows jsonb not null,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  constraint csv_import_batches_type_check check (type in ('menu', 'hours')),
  constraint csv_import_batches_status_check check (status in ('pending', 'applied')),
  constraint csv_import_batches_applied_at_check check ((status = 'applied') = (applied_at is not null))
);

create index csv_import_batches_admin_id_idx on csv_import_batches (admin_id);

alter table csv_import_batches enable row level security;
-- 정책을 추가하지 않는다: 서비스 롤 키를 쓰는 서버 코드만 접근 가능하다(기존 테이블과 동일한 패턴).
