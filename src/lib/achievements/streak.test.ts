import { describe, expect, it } from "vitest";
import { isSameRestaurantStreakOfThree } from "./streak";

describe("isSameRestaurantStreakOfThree", () => {
  it("최근 3건이 모두 같은 식당이고 날짜가 다르면 true다", () => {
    const visits = [
      { restaurantId: "r-1", visitDate: "2026-07-27" },
      { restaurantId: "r-1", visitDate: "2026-07-24" },
      { restaurantId: "r-1", visitDate: "2026-07-22" },
    ];
    expect(isSameRestaurantStreakOfThree(visits)).toBe(true);
  });

  it("3건 미만이면 false다", () => {
    const visits = [
      { restaurantId: "r-1", visitDate: "2026-07-27" },
      { restaurantId: "r-1", visitDate: "2026-07-24" },
    ];
    expect(isSameRestaurantStreakOfThree(visits)).toBe(false);
  });

  it("식당이 다르면 false다", () => {
    const visits = [
      { restaurantId: "r-1", visitDate: "2026-07-27" },
      { restaurantId: "r-2", visitDate: "2026-07-24" },
      { restaurantId: "r-1", visitDate: "2026-07-22" },
    ];
    expect(isSameRestaurantStreakOfThree(visits)).toBe(false);
  });

  it("같은 날짜가 중복되면(방어적 처리) false다", () => {
    const visits = [
      { restaurantId: "r-1", visitDate: "2026-07-27" },
      { restaurantId: "r-1", visitDate: "2026-07-27" },
      { restaurantId: "r-1", visitDate: "2026-07-22" },
    ];
    expect(isSameRestaurantStreakOfThree(visits)).toBe(false);
  });
});
