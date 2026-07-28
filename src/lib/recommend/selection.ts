import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** /recommend 화면에서 "여기로 결정"을 눌렀을 때 기록한다(추천 연동 방문 업적 판정용). */
export async function recordRecommendationSelection(
  employeeId: string,
  restaurantId: string,
  isMainPick: boolean,
  now = new Date()
): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase.from("recommendation_selections").insert({
    employee_id: employeeId,
    restaurant_id: restaurantId,
    is_main_pick: isMainPick,
    selected_at: now.toISOString(),
  });
}

/** 오늘(visitDate) 메인 추천으로 결정한 식당인지 확인한다("이게 바로 운명?" 등에서 재사용). */
export async function hasMainRecommendationSelection(
  employeeId: string,
  restaurantId: string,
  visitDate: string
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const dayStart = `${visitDate}T00:00:00+09:00`;
  const dayEnd = `${visitDate}T23:59:59.999+09:00`;

  const { count } = await supabase
    .from("recommendation_selections")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", employeeId)
    .eq("restaurant_id", restaurantId)
    .eq("is_main_pick", true)
    .gte("selected_at", dayStart)
    .lte("selected_at", dayEnd);

  return (count ?? 0) > 0;
}

/** 오늘(visitDate) 완료된 방문의 식당이, 같은 날 추천 결과에서 결정한 식당과 일치하는지 확인한다. */
export async function hasRecommendationSelection(
  employeeId: string,
  restaurantId: string,
  visitDate: string
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const dayStart = `${visitDate}T00:00:00+09:00`;
  const dayEnd = `${visitDate}T23:59:59.999+09:00`;

  const { count } = await supabase
    .from("recommendation_selections")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", employeeId)
    .eq("restaurant_id", restaurantId)
    .gte("selected_at", dayStart)
    .lte("selected_at", dayEnd);

  return (count ?? 0) > 0;
}
