"use server";

import { redirect } from "next/navigation";
import { decideRestaurant } from "@/app/visits/actions";
import { getCurrentEmployee } from "@/lib/auth/session";
import { recordAchievementEvent } from "@/lib/achievements/events";
import {
  addExclusion,
  getExclusionList,
  hasReachedRerollThreshold,
  setExclusionList,
  UUID_PATTERN,
} from "@/lib/recommend/exclusion-cookie";
import { recommendConditionsSchema, type RecommendConditionsInput } from "@/lib/recommend/validation";
import { buildRecommendUrl, buildRouletteUrl } from "@/lib/recommend/urls";
import { recordRecommendationSelection } from "@/lib/recommend/selection";
import { getSeoulDateString } from "@/lib/visits/validation";

/** 서버에서 재검증한 조건값만으로 /recommend 쿼리 문자열을 다시 구성한다(클라이언트가 넘긴 값은 신뢰하지 않는다). */
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
  const employee = await getCurrentEmployee();
  if (!employee) {
    throw new Error("로그인이 필요합니다.");
  }

  const parsed = recommendConditionsSchema.safeParse(rawConditions);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "조건 값이 올바르지 않습니다.");
  }

  if (typeof mainRestaurantId === "string" && UUID_PATTERN.test(mainRestaurantId)) {
    const current = await getExclusionList();
    const updated = addExclusion(current, mainRestaurantId);
    await setExclusionList(updated);

    if (hasReachedRerollThreshold(updated.length)) {
      await recordAchievementEvent({
        employeeId: employee.id,
        eventType: "RECOMMENDATION_REROLLED_10",
        eventKey: `RECOMMENDATION_REROLLED_10:${employee.id}:${getSeoulDateString(new Date())}`,
        referenceType: "employee",
        referenceId: employee.id,
      });
    }
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

/** 추천 결과 카드의 "여기로 결정" 전용 래퍼. 선택 시점을 기록한 뒤 기존 결정 로직을 그대로 재사용한다. */
export async function decideRecommendedRestaurant(restaurantId: string, isMainPick: boolean) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect("/login");
  }

  if (typeof restaurantId === "string" && UUID_PATTERN.test(restaurantId)) {
    await recordRecommendationSelection(employee.id, restaurantId, isMainPick);
  }

  await decideRestaurant(restaurantId);
}

export async function rerollRoulette(mainRestaurantId: string, rawConditions: RecommendConditionsInput) {
  await requireEmployee();
  const parsed = recommendConditionsSchema.safeParse(rawConditions);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "조건 값이 올바르지 않습니다.");
  }
  if (typeof mainRestaurantId === "string" && UUID_PATTERN.test(mainRestaurantId)) {
    await setExclusionList(addExclusion(await getExclusionList(), mainRestaurantId));
  }
  redirect(buildRouletteUrl(parsed.data));
}
