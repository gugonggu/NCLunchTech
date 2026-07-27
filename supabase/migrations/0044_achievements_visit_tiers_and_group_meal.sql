-- 업적 시스템 2단계: 방문 누적 3단계(점심 기록가 I/II/III) + 함께 먹기 첫 완료(혼밥 탈출)
-- 참고: docs 업적 기획·개발 명세 5절(방문 업적), 4.5절(혼밥 탈출)

insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  ('FIRST_GROUP_MEAL', '혼밥 탈출', '동료와 함께한 첫 번째 점심입니다.', 'START', 'COMMON', 1, 10, false, 40),
  ('VISIT_5', '점심 기록가 I', '점심 기록을 5번 남겼습니다.', 'VISIT', 'COMMON', 5, 10, false, 110),
  ('VISIT_20', '점심 기록가 II', '점심 기록이 어느새 20번을 넘었습니다.', 'VISIT', 'INTERMEDIATE', 20, 20, false, 120),
  ('VISIT_50', '점심 기록가 III', '50번의 점심을 기록했습니다.', 'VISIT', 'ADVANCED', 50, 40, false, 130)
on conflict (code) do nothing;

insert into titles (code, name, description, achievement_id)
select 'VISIT_50_TITLE', '점심 기록 전문가', '점심 기록을 50번 남겼습니다.', a.id
from achievements a
where a.code = 'VISIT_50'
on conflict (code) do nothing;
