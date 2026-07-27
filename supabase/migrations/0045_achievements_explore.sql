-- 업적 시스템 3단계: 탐험 업적(서로 다른 식당/음식 카테고리 방문)
-- 참고: docs 업적 기획·개발 명세 7절/9.3절. 완료된 방문(개인 방문 + 함께 먹기)에서 매번 다시
-- 집계하는 "재계산형" 업적이라 VISIT_COMPLETED 이벤트에 걸어두되 target_value만 다르다.

insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  ('UNIQUE_RESTAURANT_3', '새로운 맛', '새로운 식당 세 곳을 방문했습니다.', 'EXPLORE', 'COMMON', 3, 10, false, 210),
  ('UNIQUE_RESTAURANT_10', '점심 개척자', '익숙한 길을 벗어나 새로운 점심을 찾았습니다.', 'EXPLORE', 'INTERMEDIATE', 10, 20, false, 220),
  ('UNIQUE_RESTAURANT_20', '센텀 탐험대', '센텀 주변의 점심 지도를 넓혀가고 있습니다.', 'EXPLORE', 'ADVANCED', 20, 40, false, 230),
  ('UNIQUE_CATEGORY_3', '편식은 없습니다 I', '서로 다른 음식 분류 3종을 방문했습니다.', 'EXPLORE', 'COMMON', 3, 10, false, 240),
  ('UNIQUE_CATEGORY_6', '편식은 없습니다 II', '서로 다른 음식 분류 6종을 방문했습니다.', 'EXPLORE', 'INTERMEDIATE', 6, 20, false, 250)
on conflict (code) do nothing;

insert into titles (code, name, description, achievement_id)
select v.code, v.name, v.description, a.id
from achievements a
join (
  values
    ('UNIQUE_RESTAURANT_10_TITLE', 'UNIQUE_RESTAURANT_10', '점심 개척자', '서로 다른 식당 10곳을 방문했습니다.'),
    ('UNIQUE_RESTAURANT_20_TITLE', 'UNIQUE_RESTAURANT_20', '센텀 탐험대', '서로 다른 식당 20곳을 방문했습니다.'),
    ('UNIQUE_CATEGORY_6_TITLE', 'UNIQUE_CATEGORY_6', '메뉴 탐험가', '서로 다른 음식 분류 6종을 방문했습니다.')
) as v (code, achievement_code, name, description)
  on v.achievement_code = a.code
on conflict (code) do nothing;
