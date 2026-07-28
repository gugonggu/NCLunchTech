import { describe, expect, it } from "vitest";
import { hasRevisitedAfterGap, isSameRestaurantStreakOfThree } from "./streak";

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

describe("hasRevisitedAfterGap", () => {
  it("직전 방문이 60일 이상 전이면 true다", () => {
    expect(hasRevisitedAfterGap(["2026-05-20"], "2026-07-28", 60)).toBe(true);
  });

  it("직전 방문이 60일 미만이면 false다", () => {
    expect(hasRevisitedAfterGap(["2026-07-01"], "2026-07-28", 60)).toBe(false);
  });

  it("이전 방문 기록이 없으면(첫 방문) false다", () => {
    expect(hasRevisitedAfterGap([], "2026-07-28", 60)).toBe(false);
  });
});
