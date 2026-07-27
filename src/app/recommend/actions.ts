"use server";

import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { addExclusion, getExclusionList, setExclusionList, UUID_PATTERN } from "@/lib/recommend/exclusion-cookie";
import { recommendConditionsSchema, type RecommendConditionsInput } from "@/lib/recommend/validation";
import { buildRecommendUrl, buildRouletteUrl } from "@/lib/recommend/urls";

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
