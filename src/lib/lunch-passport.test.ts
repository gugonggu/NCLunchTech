import { describe, expect, it } from "vitest";
import { buildLunchPassport } from "./lunch-passport";

const restaurants = [
  { id: "r1", name: "가람", category: "한식", isActive: true },
  { id: "r2", name: "나루", category: "한식", isActive: true },
  { id: "r3", name: "다온", category: "중식", isActive: true },
  { id: "inactive", name: "라온", category: "일식", isActive: false },
];

describe("buildLunchPassport", () => {
  it("완료 방문을 식당별로 누적하고 전체 수집률을 계산한다", () => {
    const passport = buildLunchPassport(restaurants, [
      { restaurantId: "r1", visitedOn: "2026-07-01" },
      { restaurantId: "r1", visitedOn: "2026-07-10" },
      { restaurantId: "r3", visitedOn: "2026-07-05" },
    ]);

    expect(passport).toMatchObject({ totalRestaurantCount: 3, visitedRestaurantCount: 2, completionRate: 2 / 3 });
    expect(passport.categories.find((category) => category.category === "한식")?.restaurants).toEqual([
      { restaurantId: "r1", restaurantName: "가람", visitCount: 2, firstVisitedOn: "2026-07-01", lastVisitedOn: "2026-07-10" },
    ]);
  });

  it("비활성 식당과 알 수 없는 방문은 제외한다", () => {
    const passport = buildLunchPassport(restaurants, [
      { restaurantId: "inactive", visitedOn: "2026-07-01" },
      { restaurantId: "unknown", visitedOn: "2026-07-01" },
      { restaurantId: "r1", visitedOn: "2026-07-01" },
    ]);

    expect(passport).toMatchObject({ totalRestaurantCount: 3, visitedRestaurantCount: 1 });
    expect(passport.categories.map((category) => category.category)).not.toContain("일식");
  });

  it("방문하지 않은 카테고리는 빈 수집 목록과 0% 완료율을 가진다", () => {
    const passport = buildLunchPassport(restaurants, []);
    const chinese = passport.categories.find((category) => category.category === "중식");

    expect(chinese).toMatchObject({ totalRestaurantCount: 1, visitedRestaurantCount: 0, completionRate: 0, restaurants: [] });
  });

  it("같은 카테고리의 방문 식당을 이름순으로 정렬한다", () => {
    const passport = buildLunchPassport(restaurants, [
      { restaurantId: "r2", visitedOn: "2026-07-02" },
      { restaurantId: "r1", visitedOn: "2026-07-01" },
    ]);

    expect(passport.categories.find((category) => category.category === "한식")?.restaurants.map((restaurant) => restaurant.restaurantName)).toEqual([
      "가람",
      "나루",
    ]);
  });
});
