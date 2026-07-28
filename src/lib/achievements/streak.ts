import { daysBetweenDateStrings } from "@/lib/visits/validation";

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

/**
 * 오늘 이전의 완료 방문 날짜(최근순, 오늘 제외) 중 가장 최근 것과 오늘 사이의 간격이
 * minGapDays 이상인지 판정한다(숨겨진 업적 "다시 만난 맛"). 이전 방문이 없으면(첫 방문) false다.
 */
export function hasRevisitedAfterGap(
  previousVisitDatesDescendingExcludingToday: string[],
  todayVisitDate: string,
  minGapDays: number
): boolean {
  const [mostRecentPrevious] = previousVisitDatesDescendingExcludingToday;
  if (!mostRecentPrevious) return false;
  return daysBetweenDateStrings(todayVisitDate, mostRecentPrevious) >= minGapDays;
}
