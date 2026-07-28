import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getSeoulDateString } from "@/lib/visits/validation";

export const LOW_TRAFFIC_WINDOW_DAYS = 60;
export const LOW_TRAFFIC_MAX_VISITS = 5;

/** 내가 방문한 식당 중, 최근 60일간 전체 방문(모든 직원 합산)이 기준 이하인 곳만 고른다(순수 함수). */
export function findLowTrafficRestaurantIds(
  myVisitedRestaurantIds: string[],
  globalVisitCounts: Map<string, number>,
  maxVisits: number
): string[] {
  return myVisitedRestaurantIds.filter((id) => (globalVisitCounts.get(id) ?? 0) <= maxVisits);
}

/**
 * 최근 60일간 전체 완료 방문(개인 방문만, 함께 먹기 제외)이 5회 이하인 식당을,
 * 이 직원이 방문한 적 있는지 확인한다(숨은 맛집 발견 업적).
 */
export async function hasVisitedLowTrafficRestaurant(employeeId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const sinceDate = getSeoulDateString(new Date(Date.now() - LOW_TRAFFIC_WINDOW_DAYS * 24 * 60 * 60 * 1000));

  const [{ data: myVisits }, { data: allVisits }] = await Promise.all([
    supabase.from("visits").select("restaurant_id").eq("employee_id", employeeId).eq("status", "completed"),
    supabase.from("visits").select("restaurant_id").eq("status", "completed").gte("visit_date", sinceDate),
  ]);

  const myRestaurantIds = [...new Set((myVisits ?? []).map((v) => v.restaurant_id))];
  if (myRestaurantIds.length === 0) return false;

  const globalCounts = new Map<string, number>();
  for (const row of allVisits ?? []) {
    globalCounts.set(row.restaurant_id, (globalCounts.get(row.restaurant_id) ?? 0) + 1);
  }

  return findLowTrafficRestaurantIds(myRestaurantIds, globalCounts, LOW_TRAFFIC_MAX_VISITS).length > 0;
}
