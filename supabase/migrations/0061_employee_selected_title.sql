-- 사용자가 달성한 업적으로 얻은 칭호 중 하나를 대표 칭호로 선택해 표시할 수 있게 한다.
-- 참고: docs/superpowers/specs/2026-07-28-achievements-worldcup-design.md 3.2절.

alter table employees add column if not exists selected_title_id uuid references titles(id) on delete set null;
