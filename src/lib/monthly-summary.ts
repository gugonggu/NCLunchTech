import { getSeoulMonthRange } from "./leaderboard";

export function buildMonthlySummary(
  activities: { visits: Array<{ restaurantId: string; occurredAt: string }>; reviews: string[]; meals: string[] },
  names: Map<string, string>,
  now = new Date()
) {
  const range = getSeoulMonthRange(now);
  const visits = activities.visits.filter((visit) => visit.occurredAt >= range.start && visit.occurredAt < range.end);
  const counts = new Map<string, number>();
  for (const visit of visits) counts.set(visit.restaurantId, (counts.get(visit.restaurantId) ?? 0) + 1);
  const top = [...counts].sort((a, b) => b[1] - a[1] || (names.get(a[0]) ?? "").localeCompare(names.get(b[0]) ?? "", "ko"))[0];
  return { label: range.label, completedVisitCount: visits.length, newRestaurantCount: counts.size, reviewCount: activities.reviews.filter((at) => at >= range.start && at < range.end).length, mealRecordCount: activities.meals.filter((at) => at >= range.start && at < range.end).length, mostVisitedRestaurant: top ? { name: names.get(top[0]) ?? "알 수 없는 식당", count: top[1] } : null };
}
