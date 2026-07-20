-- 약속과 투표 연결 (2-2)
-- 참고: .claude/CLAUDE.md 6.1/6.2절, 2차 로드맵 2-2 단계
--
-- 용도가 두 가지다:
-- 1) 독립 식당 투표(2-1)가 결정된 뒤, 그 결과로 약속을 만들 때 소급 연결(기록용).
-- 2) 이미 만들어진 약속(식당 확정 상태)에서 메뉴 투표를 생성할 때 처음부터 연결.
-- 두 경우 모두 appointments.restaurant_id는 그대로 not null을 유지한다(약속은 항상 식당이
-- 정해진 상태로만 존재하고, "식당 미정" 상태는 독립 투표로 표현한다).
alter table polls add column appointment_id uuid references appointments (id) on delete cascade;
create index polls_appointment_id_idx on polls (appointment_id);
