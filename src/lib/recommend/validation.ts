import { z } from "zod";
import { RADIUS_OPTIONS_M, RESTAURANT_CATEGORIES } from "@/lib/restaurants/constants";

export const recommendConditionsSchema = z.object({
  restaurantName: z.string().trim().max(50, "검색어는 50자 이하여야 합니다.").optional(),
  menuName: z.string().trim().max(50, "검색어는 50자 이하여야 합니다.").optional(),
  category: z.enum(RESTAURANT_CATEGORIES).optional(),
  radius: z.coerce
    .number()
    .refine(
      (r) => (RADIUS_OPTIONS_M as readonly number[]).includes(r),
      "반경 값이 올바르지 않습니다."
    )
    .optional(),
  maxPriceWon: z.coerce
    .number()
    .int("가격은 정수여야 합니다.")
    .min(0, "가격은 0 이상이어야 합니다.")
    .optional(),
  excludeRecentVisits: z.boolean().optional(),
  excludeCongested: z.boolean().optional(),
});

export type RecommendConditionsInput = z.infer<typeof recommendConditionsSchema>;

export interface RawRecommendParams {
  restaurantName?: string;
  menuName?: string;
  category?: string;
  radius?: string;
  maxPriceWon?: string;
  excludeRecentVisits?: string;
  excludeCongested?: string;
}

export interface NormalizedRecommendParams {
  restaurantName?: string;
  menuName?: string;
  category?: string;
  radius?: string;
  maxPriceWon?: string;
  excludeRecentVisits?: boolean;
  excludeCongested?: boolean;
}

/** 빈 문자열은 "값 없음"으로 취급해 undefined로 바꾼다(숫자 필드가 0으로 잘못 강제 변환되는 것을 막는다). */
export function normalizeRecommendParams(input: RawRecommendParams): NormalizedRecommendParams {
  const clean = (v?: string) => (v !== undefined && v.trim() !== "" ? v : undefined);
  return {
    restaurantName: clean(input.restaurantName),
    menuName: clean(input.menuName),
    category: clean(input.category),
    radius: clean(input.radius),
    maxPriceWon: clean(input.maxPriceWon),
    excludeRecentVisits: input.excludeRecentVisits === "on" ? true : undefined,
    excludeCongested: input.excludeCongested === "on" ? true : undefined,
  };
}
