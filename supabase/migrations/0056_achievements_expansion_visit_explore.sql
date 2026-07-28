-- 2차 확장 업적 1/2: 점심은 계속된다(누적 방문 100회) / 센텀 미식가(서로 다른 식당 40곳)
-- 참고: docs/superpowers/specs/2026-07-28-achievements-worldcup-design.md 5.4절/7.4절.

insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  ('VISIT_100', '점심은 계속된다', '앤시점심기술과 함께 100번의 점심을 먹었습니다.', 'VISIT', 'SPECIAL', 100, 40, false, 140),
  ('UNIQUE_RESTAURANT_40', '센텀 미식가', '주변 식당을 물어보면 가장 먼저 떠오르는 사람입니다.', 'EXPLORE', 'ADVANCED', 40, 40, false, 260)
on conflict (code) do nothing;

insert into titles (code, name, description, achievement_id)
select v.code, v.name, v.description, a.id
from achievements a
join (
  values
    ('VISIT_100_TITLE', 'VISIT_100', '100끼의 기록자', '앤시점심기술과 함께 100번의 점심을 먹었습니다.'),
    ('UNIQUE_RESTAURANT_40_TITLE', 'UNIQUE_RESTAURANT_40', '센텀 미식가', '서로 다른 식당 40곳을 방문했습니다.')
) as v (code, achievement_code, name, description)
  on v.achievement_code = a.code
on conflict (code) do nothing;
