-- 2차 확장 업적: 데이터 엔지니어(메뉴 등록 + 정보 수정 합산 30회)
-- 참고: docs/superpowers/specs/2026-07-28-achievements-worldcup-design.md 9.8절.

insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  ('CONTRIBUTION_TOTAL_30', '데이터 엔지니어', '앤시점심기술의 데이터를 더 정확하게 만들었습니다.', 'CONTRIBUTION', 'ADVANCED', 30, 40, false, 350)
on conflict (code) do nothing;

insert into titles (code, name, description, achievement_id)
select 'CONTRIBUTION_TOTAL_30_TITLE', '점심 데이터 엔지니어', '메뉴 등록·정보 수정을 합쳐 30회 기여했습니다.', a.id
from achievements a
where a.code = 'CONTRIBUTION_TOTAL_30'
on conflict (code) do nothing;
