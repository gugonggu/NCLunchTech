-- 2차 확장 업적: 취향 확실하시네요(월드컵 동일 메뉴 5회 우승) / 앤시 외교관(서로 다른 동료 15명과 식사)
-- 참고: docs/superpowers/specs/2026-07-28-achievements-worldcup-design.md 8.8절/10.6절.

insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  ('WORLDCUP_SAME_MENU_WIN_5', '취향 확실하시네요', '우승 메뉴가 자꾸 익숙합니다.', 'WORLDCUP', 'INTERMEDIATE', 5, 20, false, 640),
  ('SOCIAL_UNIQUE_PARTNERS_15', '다양한 점심 친구 II', '다양한 동료들과 점심을 함께했습니다.', 'SOCIAL', 'ADVANCED', 15, 40, false, 440)
on conflict (code) do nothing;

insert into titles (code, name, description, achievement_id)
select 'SOCIAL_UNIQUE_PARTNERS_15_TITLE', '앤시 외교관', '서로 다른 동료 15명과 점심을 함께했습니다.', a.id
from achievements a
where a.code = 'SOCIAL_UNIQUE_PARTNERS_15'
on conflict (code) do nothing;
