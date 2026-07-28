import { describe, expect, it } from "vitest";
import { findLowTrafficRestaurantIds } from "./low-traffic-restaurants";

describe("findLowTrafficRestaurantIds", () => {
  it("전체 방문이 기준 이하인, 내가 방문한 식당만 골라낸다", () => {
    const result = findLowTrafficRestaurantIds(
      ["r-1", "r-2"],
      new Map([["r-1", 5], ["r-2", 6], ["r-3", 2]]),
      5
    );
    expect(result).toEqual(["r-1"]);
  });

  it("내가 방문한 식당이 없으면 빈 배열이다", () => {
    expect(findLowTrafficRestaurantIds([], new Map([["r-1", 1]]), 5)).toEqual([]);
  });
});
