-- 리뷰 도움돼요 (2-4b)
-- 참고: .claude/CLAUDE.md 6.4절

create table review_reactions (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews (id) on delete cascade,
  employee_id uuid not null references employees (id),
  created_at timestamptz not null default now(),
  constraint review_reactions_unique unique (review_id, employee_id)
);

create index review_reactions_review_id_idx on review_reactions (review_id);

alter table review_reactions enable row level security;
-- 정책을 추가하지 않는다: 서비스 롤 키를 쓰는 서버 코드만 접근 가능하다(기존 테이블과 동일한 패턴).
-- "좋아요" 성격이라 리뷰·댓글과 달리 감사·복구가 필요 없어 하드 삭제(토글)로 처리한다.
