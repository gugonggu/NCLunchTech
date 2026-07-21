-- 관리자의 혼잡·영업 상태 제보 무효화 (2-9)
-- 참고: .claude/CLAUDE.md 6.10절, 2차 로드맵 2-9 단계
--
-- 삭제하지 않고 invalidated_at만 채운다(감사 목적 보존). 식당 상세·추천의 "신선한 제보"
-- 조회는 invalidated_at is null 조건만 추가하면 되고, 유효 시간 판정 로직 자체는 그대로 둔다.

alter table restaurant_status_reports add column invalidated_at timestamptz;
alter table restaurant_status_reports add column invalidated_by uuid references admins (id);
