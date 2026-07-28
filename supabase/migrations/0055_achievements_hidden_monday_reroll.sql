-- 숨겨진 업적: 월요일부터 든든하게 / 선택의 늪
-- 참고: docs 앤시점심기술 미니게임 및 업적 시스템 개발 명세 11.1절/11.2절.

insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  ('HIDDEN_MONDAY_SOUP', '월요일부터 든든하게', '한 주의 시작은 역시 든든한 국물입니다.', 'HIDDEN', 'SPECIAL', 1, 20, true, 520),
  ('HIDDEN_REROLL_10', '선택의 늪', '추천은 충분했지만 결정은 쉽지 않았습니다.', 'HIDDEN', 'SPECIAL', 1, 20, true, 530)
on conflict (code) do nothing;
