-- 방문 확인(다녀왔어요/가지 않았어요)과 리뷰
-- 참고: .claude/CLAUDE.md 13절

-- 참여자 상태에 completed(다녀왔어요)를 추가한다. 가지 않았어요는 기존 cancelled를 재사용한다.
alter table appointment_participants drop constraint appointment_participants_status_check;
alter table appointment_participants add constraint appointment_participants_status_check
  check (status in ('pending', 'accepted', 'declined', 'cancelled', 'completed'));

-- 방장은 참여자 행이 없으므로(10단계 설계), 방장 본인의 방문 확인은 약속 자체에 컬럼으로 둔다.
alter table appointments add column host_attendance_status text;
alter table appointments add column host_attendance_confirmed_at timestamptz;
alter table appointments add constraint appointments_host_attendance_status_check
  check (host_attendance_status is null or host_attendance_status in ('completed', 'cancelled'));
alter table appointments add constraint appointments_host_attendance_confirmed_at_check
  check ((host_attendance_status is not null) = (host_attendance_confirmed_at is not null));

create table reviews (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id),
  restaurant_id uuid not null references restaurants (id),
  taste_rating smallint not null,
  speed_rating smallint not null,
  price_rating smallint not null,
  solo_fit_rating smallint not null,
  revisit_intent text not null,
  portion_rating smallint,
  crowdedness_rating smallint,
  group_fit_rating smallint,
  cleanliness_rating smallint,
  tags text[],
  one_line_review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_unique_per_employee_restaurant unique (employee_id, restaurant_id),
  constraint reviews_revisit_intent_check check (revisit_intent in ('again', 'maybe', 'no')),
  constraint reviews_taste_rating_check check (taste_rating between 1 and 5),
  constraint reviews_speed_rating_check check (speed_rating between 1 and 5),
  constraint reviews_price_rating_check check (price_rating between 1 and 5),
  constraint reviews_solo_fit_rating_check check (solo_fit_rating between 1 and 5),
  constraint reviews_portion_rating_check check (portion_rating is null or portion_rating between 1 and 5),
  constraint reviews_crowdedness_rating_check check (crowdedness_rating is null or crowdedness_rating between 1 and 5),
  constraint reviews_group_fit_rating_check check (group_fit_rating is null or group_fit_rating between 1 and 5),
  constraint reviews_cleanliness_rating_check check (cleanliness_rating is null or cleanliness_rating between 1 and 5),
  constraint reviews_one_line_review_length_check check (one_line_review is null or char_length(one_line_review) <= 200)
);

create index reviews_restaurant_id_idx on reviews (restaurant_id);

alter table reviews enable row level security;
-- 정책을 추가하지 않는다: 서비스 롤 키를 쓰는 서버 코드만 접근 가능하다(기존 테이블과 동일한 패턴).
