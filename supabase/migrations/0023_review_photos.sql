-- 리뷰 사진 (2-5)
-- 참고: .claude/CLAUDE.md 6.5절, 2차 로드맵 2-5 단계

insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', true)
on conflict (id) do nothing;

create table review_photos (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews (id) on delete cascade,
  employee_id uuid not null references employees (id),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index review_photos_review_id_idx on review_photos (review_id);

alter table review_photos enable row level security;
-- 정책을 추가하지 않는다: 업로드·삭제는 service role 서버 코드에서만 수행한다(기존 테이블과 동일 패턴).
-- 이미지 파일 자체는 버킷을 public으로 만들어 공개 URL로 직접 서빙한다(로그인 없이도 URL로 접근 가능 —
-- 사내 서비스이고 음식/식당 사진이라 민감하지 않다고 판단, 사용자 확인 완료).
