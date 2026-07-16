import { describe, expect, it } from "vitest";
import { normalizeRecommendParams, recommendConditionsSchema } from "./validation";

describe("normalizeRecommendParams", () => {
  it("빈 문자열과 공백 문자열을 undefined로 바꾼다", () => {
    const result = normalizeRecommendParams({
      restaurantName: "",
      menuName: "  ",
      category: "한식",
      radius: undefined,
      maxPriceWon: "8000",
    });
    expect(result).toEqual({
      restaurantName: undefined,
      menuName: undefined,
      category: "한식",
      radius: undefined,
      maxPriceWon: "8000",
    });
  });

  it("체크박스가 켜져 있으면(on) excludeRecentVisits를 true로, 없으면 undefined로 바꾼다", () => {
    expect(normalizeRecommendParams({ excludeRecentVisits: "on" }).excludeRecentVisits).toBe(true);
    expect(normalizeRecommendParams({}).excludeRecentVisits).toBeUndefined();
  });
});

describe("recommendConditionsSchema", () => {
  it("전체 조건이 유효하면 통과한다", () => {
    const result = recommendConditionsSchema.safeParse({
      restaurantName: "냉면",
      menuName: "돈까스",
      category: "한식",
      radius: "800",
      maxPriceWon: "8000",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.radius).toBe(800);
      expect(result.data.maxPriceWon).toBe(8000);
    }
  });

  it("빈 값(undefined)만 있어도 통과한다(즉시 추천)", () => {
    const result = recommendConditionsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("허용되지 않은 카테고리는 거부한다", () => {
    const result = recommendConditionsSchema.safeParse({ category: "없는분류" });
    expect(result.success).toBe(false);
  });

  it("허용되지 않은 반경 값은 거부한다", () => {
    const result = recommendConditionsSchema.safeParse({ radius: "999" });
    expect(result.success).toBe(false);
  });

  it("음수 가격은 거부한다", () => {
    const result = recommendConditionsSchema.safeParse({ maxPriceWon: "-1000" });
    expect(result.success).toBe(false);
  });

  it("정수가 아닌 가격은 거부한다", () => {
    const result = recommendConditionsSchema.safeParse({ maxPriceWon: "1000.5" });
    expect(result.success).toBe(false);
  });
});
