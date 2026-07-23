import { describe, expect, it } from "vitest";
import { buildRouletteUrl } from "./urls";

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
});
