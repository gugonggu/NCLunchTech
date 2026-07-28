import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** 완료 방문 목록에서 식당별 방문 횟수를 센다(순수 함수, DB 접근 없음). */
export function countVisitsPerRestaurant(rows: { restaurantId: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.restaurantId, (counts.get(row.restaurantId) ?? 0) + 1);
  }
  return counts;
}

/**
 * 개인 방문(visits) 완료 기록 기준으로, 이 직원이 가장 많이 방문한 단일 식당의 방문 횟수를 구한다.
 * "사장님이 알아볼 듯" 업적(같은 식당 20회)의 재계산 지표로 쓴다. 함께 먹기(appointments)는
 * 포함하지 않는다(개인 방문만 명확히 "그 식당에 그 사람으로" 간 기록이라 판단).
 */
export async function getMaxSingleRestaurantVisitCount(employeeId: string): Promise<number> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("visits")
    .select("restaurant_id")
    .eq("employee_id", employeeId)
    .eq("status", "completed");

  const counts = countVisitsPerRestaurant((data ?? []).map((row) => ({ restaurantId: row.restaurant_id })));
  return counts.size === 0 ? 0 : Math.max(...counts.values());
}
