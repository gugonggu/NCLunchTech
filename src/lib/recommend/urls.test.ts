import { describe, expect, it } from "vitest";
import { RESTAURANT_CATEGORIES } from "@/lib/restaurants/constants";
import { buildRecommendUrl, buildRouletteUrl } from "./urls";

describe("buildRouletteUrl", () => {
  it("preserves active recommendation conditions in the roulette URL", () => {
    expect(
      buildRouletteUrl({
        category: "한식",
        radius: 600,
        maxPriceWon: 10_000,
        excludeRecentVisits: true,
      })
    ).toBe("/roulette?category=%ED%95%9C%EC%8B%9D&radius=600&maxPrice=10000&excludeRecent=on");
  });

  it("preserves every excluded category in recommendation and roulette URLs", () => {
    const conditions = { excludedCategories: [RESTAURANT_CATEGORIES[0], RESTAURANT_CATEGORIES[1]] };

    for (const url of [buildRecommendUrl(conditions), buildRouletteUrl(conditions)]) {
      expect(new URL(url, "https://example.com").searchParams.getAll("excludeCategory")).toEqual(
        conditions.excludedCategories,
      );
    }
  });
});
