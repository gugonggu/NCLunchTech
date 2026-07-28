-- 업적 시스템 7단계: 월드컵 참가 누적(월드컵 참가자 / 메뉴 월드컵 베테랑)
-- 참고: docs 앤시점심기술 미니게임 및 업적 시스템 개발 명세 9.4절. 메뉴 월드컵과 식당 월드컵을
-- 구분하지 않고 WORLDCUP_COMPLETED 이벤트 하나로 합산한다.

insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  ('WORLDCUP_5', '월드컵 참가자', '메뉴 토너먼트에 다섯 번 참가했습니다.', 'WORLDCUP', 'COMMON', 5, 10, false, 610),
  ('WORLDCUP_20', '메뉴 월드컵 베테랑', '메뉴 토너먼트에 스무 번 참가했습니다.', 'WORLDCUP', 'INTERMEDIATE', 20, 20, false, 620)
on conflict (code) do nothing;

insert into titles (code, name, description, achievement_id)
select 'WORLDCUP_20_TITLE', '메뉴 월드컵 베테랑', '메뉴 토너먼트에 스무 번 참가했습니다.', a.id
from achievements a
where a.code = 'WORLDCUP_20'
on conflict (code) do nothing;
