/** 가격 수정이 실제로 값이 바뀐 것인지 판정한다(같은 값 재저장은 업적으로 인정하지 않음). */
export function hasMenuPriceChanged(
  before: { price: number | null } | null,
  after: { price: number | null } | null
): boolean {
  if (!before || !after) return true;
  return before.price !== after.price;
}

/** 영업시간 수정이 실제로 내용이 바뀐 것인지 판정한다(요일별 배열 전체를 비교). */
export function hasRestaurantHoursChanged(
  before: unknown[] | null,
  after: unknown[] | null
): boolean {
  if (!before || !after) return true;

  const normalize = (rows: unknown[]) =>
    JSON.stringify(
      (rows as Array<{ day_of_week: number; is_closed: boolean; open_time: string | null; close_time: string | null }>)
        .map((r) => ({ day: r.day_of_week, closed: r.is_closed, open: r.open_time, close: r.close_time }))
        .sort((a, b) => a.day - b.day)
    );

  return normalize(before) !== normalize(after);
}
