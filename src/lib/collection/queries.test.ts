import { describe, expect, it } from "vitest";
import { buildCategoryBreakdown } from "./queries";

describe("buildCategoryBreakdown", () => {
  it("분류별로 전체/방문 개수를 집계한다", () => {
    const categories = ["한식", "중식", "일식"];
    const restaurants = [
      { id: "a", category: "한식" },
      { id: "b", category: "한식" },
      { id: "c", category: "중식" },
    ];
    const visitedIds = new Set(["a"]);

    const result = buildCategoryBreakdown(categories, restaurants, visitedIds);

    expect(result).toEqual([
      { category: "한식", totalCount: 2, visitedCount: 1 },
      { category: "중식", totalCount: 1, visitedCount: 0 },
      { category: "일식", totalCount: 0, visitedCount: 0 },
    ]);
  });

  it("주어진 categories 순서를 그대로 유지한다", () => {
    const result = buildCategoryBreakdown(["기타", "한식"], [], new Set());
    expect(result.map((r) => r.category)).toEqual(["기타", "한식"]);
  });

  it("방문 기록이 없으면 모든 분류의 visitedCount가 0이다", () => {
    const categories = ["한식"];
    const restaurants = [{ id: "a", category: "한식" }];
    const result = buildCategoryBreakdown(categories, restaurants, new Set());
    expect(result[0].visitedCount).toBe(0);
  });
});
