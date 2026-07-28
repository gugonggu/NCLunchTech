import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getVisitedRestaurantIds } from "@/lib/collection/queries";
import { getUniqueDiningPartnerCount } from "@/lib/appointments/dining-partners";
import { getMaxSingleRestaurantVisitCount } from "@/lib/collection/restaurant-visit-counts";
import { hasVisitedLowTrafficRestaurant } from "@/lib/collection/low-traffic-restaurants";
import { getLastCompletedVisits } from "@/lib/visits/queries";
import { getMaxWorldcupMenuWinCount } from "@/lib/worldcup/menu-win-counts";
import { isSameRestaurantStreakOfThree } from "./streak";

export type RecomputeMetric =
  | "unique_restaurant_count"
  | "unique_category_count"
  | "same_restaurant_streak_3"
  | "max_single_restaurant_visit_count"
  | "max_worldcup_menu_win_count"
  | "unique_dining_partner_count"
  | "has_visited_low_traffic_restaurant";

/** 재계산형 업적 코드 → 어떤 지표를 써야 하는지. 같은 지표를 쓰는 업적끼리는 계산을 한 번만 한다. */
export const RECOMPUTE_METRIC_BY_CODE: Record<string, RecomputeMetric> = {
  UNIQUE_RESTAURANT_3: "unique_restaurant_count",
  UNIQUE_RESTAURANT_10: "unique_restaurant_count",
  UNIQUE_RESTAURANT_20: "unique_restaurant_count",
  UNIQUE_RESTAURANT_40: "unique_restaurant_count",
  UNIQUE_CATEGORY_3: "unique_category_count",
  UNIQUE_CATEGORY_6: "unique_category_count",
  HIDDEN_SAME_RESTAURANT_3_CONSECUTIVE: "same_restaurant_streak_3",
  RESTAURANT_VISIT_20: "max_single_restaurant_visit_count",
  WORLDCUP_SAME_MENU_WIN_5: "max_worldcup_menu_win_count",
  SOCIAL_UNIQUE_PARTNERS_15: "unique_dining_partner_count",
  LOW_TRAFFIC_RESTAURANT_VISIT: "has_visited_low_traffic_restaurant",
};

async function computeUniqueCategoryCount(employeeId: string): Promise<number> {
  const visitedIds = await getVisitedRestaurantIds(employeeId);
  if (visitedIds.size === 0) {
    return 0;
  }

  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("restaurants").select("category").in("id", [...visitedIds]);
  return new Set((data ?? []).map((r) => r.category)).size;
}

async function computeSameRestaurantStreak(employeeId: string): Promise<number> {
  const recentVisits = await getLastCompletedVisits(employeeId, 3);
  return isSameRestaurantStreakOfThree(recentVisits) ? 1 : 0;
}

/** employeeId 기준으로 지표 값을 계산한다(원본 방문 데이터에서 매번 다시 집계 — 캐시는 호출 쪽 책임). */
export async function computeRecomputeMetric(employeeId: string, metric: RecomputeMetric): Promise<number> {
  if (metric === "unique_restaurant_count") {
    const visitedIds = await getVisitedRestaurantIds(employeeId);
    return visitedIds.size;
  }
  if (metric === "unique_category_count") {
    return computeUniqueCategoryCount(employeeId);
  }
  if (metric === "max_single_restaurant_visit_count") {
    return getMaxSingleRestaurantVisitCount(employeeId);
  }
  if (metric === "max_worldcup_menu_win_count") {
    return getMaxWorldcupMenuWinCount(employeeId);
  }
  if (metric === "unique_dining_partner_count") {
    return getUniqueDiningPartnerCount(employeeId);
  }
  if (metric === "has_visited_low_traffic_restaurant") {
    return (await hasVisitedLowTrafficRestaurant(employeeId)) ? 1 : 0;
  }
  return computeSameRestaurantStreak(employeeId);
}
