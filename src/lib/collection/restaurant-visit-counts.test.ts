import { describe, expect, it } from "vitest";
import { countVisitsPerRestaurant } from "./restaurant-visit-counts";

describe("countVisitsPerRestaurant", () => {
  it("식당별 방문 횟수를 센다", () => {
    const result = countVisitsPerRestaurant([
      { restaurantId: "r-1" },
      { restaurantId: "r-1" },
      { restaurantId: "r-2" },
    ]);
    expect(result).toEqual(new Map([["r-1", 2], ["r-2", 1]]));
  });

  it("빈 배열이면 빈 Map이다", () => {
    expect(countVisitsPerRestaurant([])).toEqual(new Map());
  });
});
