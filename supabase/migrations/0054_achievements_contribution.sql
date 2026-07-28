-- 리뷰 및 정보 기여 업적: 메뉴 수집가 I / 정보 수정 요원
-- 참고: docs 앤시점심기술 미니게임 및 업적 시스템 개발 명세 9.5절.
-- 이 프로젝트에는 관리자 승인 단계가 없다(직원의 메뉴 등록/가격/영업시간 수정은 즉시 반영됨).
-- 따라서 "승인" 대신 "성공적으로 저장됨"을 판정 기준으로 쓴다.

insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  ('MENU_APPROVED_5', '메뉴 수집가 I', '식당의 메뉴 정보를 다섯 개 추가했습니다.', 'CONTRIBUTION', 'COMMON', 5, 10, false, 330),
  ('INFO_UPDATE_APPROVED_5', '정보 수정 요원', '오래되거나 잘못된 식당 정보를 바로잡았습니다.', 'CONTRIBUTION', 'INTERMEDIATE', 5, 20, false, 340)
on conflict (code) do nothing;

insert into titles (code, name, description, achievement_id)
select 'INFO_UPDATE_APPROVED_5_TITLE', '정보 수정 요원', '식당 정보 수정 5회를 완료했습니다.', a.id
from achievements a
where a.code = 'INFO_UPDATE_APPROVED_5'
on conflict (code) do nothing;
