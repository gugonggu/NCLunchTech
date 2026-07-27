export interface CompletedVisitRecord {
  restaurantId: string;
  visitDate: string;
}

/**
 * 최근순으로 정렬된 완료 방문 중 마지막 3건이 서로 다른 날짜에 같은 식당인지 판정한다(순수 함수).
 * 3건 미만이면 아직 판정할 수 없으므로 false다.
 */
export function isSameRestaurantStreakOfThree(recentVisitsDescending: CompletedVisitRecord[]): boolean {
  if (recentVisitsDescending.length < 3) {
    return false;
  }

  const [first, second, third] = recentVisitsDescending;
  const sameRestaurant = first.restaurantId === second.restaurantId && second.restaurantId === third.restaurantId;
  const distinctDates = new Set([first.visitDate, second.visitDate, third.visitDate]).size === 3;

  return sameRestaurant && distinctDates;
}
