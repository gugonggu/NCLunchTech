-- 리뷰 댓글 알림이 연결할 대상: 약속이 아니라 식당 상세 화면이라 컬럼을 추가한다 (2-4a)

alter table notifications add column related_restaurant_id uuid references restaurants (id);
