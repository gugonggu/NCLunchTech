-- 리뷰 댓글 (2-4a)
-- 참고: .claude/CLAUDE.md 6.4절, 2차 로드맵 2-4 단계

create table review_comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews (id) on delete cascade,
  employee_id uuid not null references employees (id),
  content text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_comments_content_length_check check (char_length(btrim(content)) between 1 and 300)
);

-- 리뷰별 댓글 목록(작성 순)과, 관리자 신고 처리 시 대상 조회에 쓴다.
create index review_comments_review_id_idx on review_comments (review_id, created_at);

alter table review_comments enable row level security;
-- 정책을 추가하지 않는다: 서비스 롤 키를 쓰는 서버 코드만 접근 가능하다(기존 테이블과 동일한 패턴).
