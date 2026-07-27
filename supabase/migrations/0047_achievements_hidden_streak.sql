-- 업적 시스템 5단계: 숨겨진 업적 "오늘도 그곳"(같은 식당 서로 다른 날짜 3회 연속 방문)
-- 참고: docs 업적 기획·개발 명세 11.4절/9.7절. 달성 전에는 이름·설명·진행도를 노출하지 않는다(is_hidden).

insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  (
    'HIDDEN_SAME_RESTAURANT_3_CONSECUTIVE',
    '오늘도 그곳',
    '메뉴를 고민할 필요가 없는 한 주였습니다.',
    'HIDDEN',
    'SPECIAL',
    1,
    20,
    true,
    510
  )
on conflict (code) do nothing;
