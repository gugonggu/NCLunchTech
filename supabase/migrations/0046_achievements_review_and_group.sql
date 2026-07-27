-- 업적 시스템 4단계: 리뷰 누적 2단계(솔직한 한마디 I/II) + 함께 먹기 누적(점심 메이트 I, 사람을 모으는 자)
-- 참고: docs 업적 기획·개발 명세 9.5절, 10.1/10.3절. 모두 기존 이벤트를 재사용하는 증가형 업적이다.

insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  ('REVIEW_5', '솔직한 한마디 I', '다섯 번의 솔직한 점심 평가를 남겼습니다.', 'CONTRIBUTION', 'COMMON', 5, 10, false, 310),
  ('REVIEW_20', '솔직한 한마디 II', '스무 번의 솔직한 점심 평가를 남겼습니다.', 'CONTRIBUTION', 'INTERMEDIATE', 20, 20, false, 320),
  ('GROUP_MEAL_5', '점심 메이트 I', '동료와 다섯 번의 점심을 함께했습니다.', 'SOCIAL', 'COMMON', 5, 10, false, 410),
  ('HOSTED_GROUP_MEAL_5', '사람을 모으는 자', '동료를 모아 다섯 번의 점심 약속을 완료했습니다.', 'SOCIAL', 'INTERMEDIATE', 5, 20, false, 420)
on conflict (code) do nothing;

insert into titles (code, name, description, achievement_id)
select v.code, v.name, v.description, a.id
from achievements a
join (
  values
    ('REVIEW_20_TITLE', 'REVIEW_20', '점심 평론가', '스무 번의 솔직한 점심 평가를 남겼습니다.'),
    ('HOSTED_GROUP_MEAL_5_TITLE', 'HOSTED_GROUP_MEAL_5', '사람을 모으는 자', '동료를 모아 다섯 번의 점심 약속을 완료했습니다.')
) as v (code, achievement_code, name, description)
  on v.achievement_code = a.code
on conflict (code) do nothing;
