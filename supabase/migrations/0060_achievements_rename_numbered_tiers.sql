-- 로마숫자(I/II) 접미사로만 구분되던 단계형 업적 이름을 개성 있는 이름으로 변경한다.
-- description(달성 조건 설명)과 titles(칭호)는 그대로 둔다.

update achievements set name = '점심 일지의 시작' where code = 'VISIT_5';
update achievements set name = '기록이 습관이 되다' where code = 'VISIT_20';
update achievements set name = '점심 아카이브' where code = 'VISIT_50';

update achievements set name = '세 가지 맛의 발견' where code = 'UNIQUE_CATEGORY_3';
update achievements set name = '여섯 가지 맛의 정복' where code = 'UNIQUE_CATEGORY_6';

update achievements set name = '다섯 마디의 솔직함' where code = 'REVIEW_5';
update achievements set name = '스무 번의 솔직함' where code = 'REVIEW_20';

update achievements set name = '점심 메이트' where code = 'GROUP_MEAL_5';
update achievements set name = '메뉴 수집가' where code = 'MENU_APPROVED_5';
update achievements set name = '다양한 점심 친구' where code = 'SOCIAL_UNIQUE_PARTNERS_15';
