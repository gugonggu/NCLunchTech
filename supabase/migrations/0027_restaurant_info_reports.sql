-- 식당 정보 최신성 제보(2차 추가 기능): 정보 오래됨/가격 변경/메뉴 삭제/영업시간 변경/폐업 추정/중복 식당
-- 기존 리뷰·댓글 신고(reports)를 식당 대상까지 다루도록 확장한다. 자동으로 식당 데이터에 반영하지
-- 않고, 관리자가 검토 후 처리한다(기존 admin_dismiss_report를 그대로 재사용, 삭제 대상이 아니므로
-- 별도 RPC는 만들지 않는다).

alter table reports add column restaurant_id uuid references restaurants (id);
alter table reports add column category text;

alter table reports drop constraint reports_one_target_check;
alter table reports add constraint reports_one_target_check
  check (
    (case when review_id is not null then 1 else 0 end)
    + (case when comment_id is not null then 1 else 0 end)
    + (case when restaurant_id is not null then 1 else 0 end) = 1
  );

alter table reports add constraint reports_restaurant_category_check
  check (
    (restaurant_id is null and category is null)
    or (
      restaurant_id is not null
      and category in ('stale_info', 'price_changed', 'menu_gone', 'hours_changed', 'closed_down', 'duplicate_restaurant')
    )
  );

-- 같은 식당에 같은 유형을 중복 제보하지 않도록 막는다(사유 텍스트가 달라도 유형이 같으면 중복으로 본다).
alter table reports add constraint reports_unique_per_reporter_restaurant_category
  unique (reporter_employee_id, restaurant_id, category);

create index reports_restaurant_id_idx on reports (restaurant_id);
