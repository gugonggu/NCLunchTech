"use server";

import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { addExclusion, getExclusionList, setExclusionList, UUID_PATTERN } from "@/lib/recommend/exclusion-cookie";
import { recommendConditionsSchema, type RecommendConditionsInput } from "@/lib/recommend/validation";

/** 서버에서 재검증한 조건값만으로 /recommend 쿼리 문자열을 다시 구성한다(클라이언트가 넘긴 값은 신뢰하지 않는다). */
function buildRecommendUrl(conditions: RecommendConditionsInput): string {
  const params = new URLSearchParams();
  if (conditions.restaurantName) params.set("q", conditions.restaurantName);
  if (conditions.menuName) params.set("menuQ", conditions.menuName);
  if (conditions.category) params.set("category", conditions.category);
  if (conditions.radius !== undefined) params.set("radius", String(conditions.radius));
  if (conditions.maxPriceWon !== undefined) params.set("maxPrice", String(conditions.maxPriceWon));
  if (conditions.excludeRecentVisits) params.set("excludeRecent", "on");

  const qs = params.toString();
  return qs ? `/recommend?${qs}` : "/recommend";
}

async function requireEmployee() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    throw new Error("로그인이 필요합니다.");
  }
}

/** 현재 메인으로 추천된 식당 1곳만 오늘의 제외 목록에 추가하고(대안은 제외하지 않음), 같은 조건으로 다시 추천한다. */
export async function rerollRecommendation(
  mainRestaurantId: string,
  rawConditions: RecommendConditionsInput
) {
  await requireEmployee();

  const parsed = recommendConditionsSchema.safeParse(rawConditions);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "조건 값이 올바르지 않습니다.");
  }

  if (typeof mainRestaurantId === "string" && UUID_PATTERN.test(mainRestaurantId)) {
    const current = await getExclusionList();
    await setExclusionList(addExclusion(current, mainRestaurantId));
  }

  redirect(buildRecommendUrl(parsed.data));
}

export async function resetExclusions(rawConditions: RecommendConditionsInput) {
  await requireEmployee();

  const parsed = recommendConditionsSchema.safeParse(rawConditions);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "조건 값이 올바르지 않습니다.");
  }

  await setExclusionList([]);
  redirect(buildRecommendUrl(parsed.data));
}
