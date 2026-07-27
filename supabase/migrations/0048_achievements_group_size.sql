-- 업적 시스템 6단계: 오늘은 다 같이(본인 포함 4명 이상의 함께 먹기 약속 완료)
-- 참고: docs 업적 기획·개발 명세 10.4절. 완료 시점 headcount(방장+accepted/completed 참여자)가
-- 4명 이상일 때만 발생하는 별도 이벤트(MEAL_GROUP_LARGE_COMPLETED)에 연결한다.

insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  ('GROUP_SIZE_4', '오늘은 다 같이', '네 명 이상의 동료와 점심을 함께했습니다.', 'SOCIAL', 'INTERMEDIATE', 1, 20, false, 430)
on conflict (code) do nothing;
