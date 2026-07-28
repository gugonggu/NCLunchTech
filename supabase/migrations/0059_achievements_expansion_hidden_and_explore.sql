-- 2차 확장 업적: 숨은 맛집 발견 / 다시 만난 맛 / 이게 바로 운명? / 데이터 스키마 보강
-- 참고: docs/superpowers/specs/2026-07-28-achievements-worldcup-design.md 7.9절/11.6절/11.8절.

alter table recommendation_selections
  add column if not exists is_main_pick boolean not null default false;

insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  ('LOW_TRAFFIC_RESTAURANT_VISIT', '숨은 맛집 발견', '아직 많은 사람이 찾지 않은 식당을 발견했습니다.', 'EXPLORE', 'INTERMEDIATE', 1, 20, false, 270),
  ('HIDDEN_REVISIT_AFTER_60_DAYS', '다시 만난 맛', '오랜만에 익숙한 식당을 다시 찾았습니다.', 'HIDDEN', 'SPECIAL', 1, 20, true, 540),
  ('HIDDEN_RECOMMENDATION_MATCHES_WORLDCUP', '이게 바로 운명?', '추천과 취향이 완벽하게 일치했습니다.', 'HIDDEN', 'SPECIAL', 1, 30, true, 550)
on conflict (code) do nothing;
