import { describe, expect, it } from "vitest";
import {
  dedupeMenuPool,
  normalizeMenuName,
  resolveTournamentSize,
  selectCandidatesWithCaps,
  type WorldcupCandidate,
} from "./candidates";

describe("normalizeMenuName", () => {
  it("앞뒤 공백을 지우고 소문자로, 내부 공백은 제거한다", () => {
    expect(normalizeMenuName("  왕돈까스  ")).toBe("왕돈까스");
    expect(normalizeMenuName("Kimchi Stew")).toBe("kimchistew");
    expect(normalizeMenuName("된 장 찌 개")).toBe("된장찌개");
  });
});

describe("dedupeMenuPool", () => {
  it("같은 정규화 이름의 메뉴를 하나로 합치고 식당 id를 모은다", () => {
    const result = dedupeMenuPool([
      { menuKey: "돈까스", name: "돈까스", categoryId: "한식", restaurantId: "r-1" },
      { menuKey: "돈까스", name: "수제돈까스", categoryId: "한식", restaurantId: "r-2" },
      { menuKey: "김치찌개", name: "김치찌개", categoryId: "한식", restaurantId: "r-1" },
    ]);

    expect(result).toEqual([
      { menuKey: "돈까스", name: "돈까스", categoryId: "한식", restaurantIds: ["r-1", "r-2"] },
      { menuKey: "김치찌개", name: "김치찌개", categoryId: "한식", restaurantIds: ["r-1"] },
    ]);
  });

  it("같은 식당이 같은 메뉴를 중복 등록해도 식당 id는 한 번만 담긴다", () => {
    const result = dedupeMenuPool([
      { menuKey: "돈까스", name: "돈까스", categoryId: "한식", restaurantId: "r-1" },
      { menuKey: "돈까스", name: "돈까스", categoryId: "한식", restaurantId: "r-1" },
    ]);
    expect(result[0].restaurantIds).toEqual(["r-1"]);
  });
});

function candidate(menuKey: string, categoryId: string, restaurantId: string): WorldcupCandidate {
  return { menuKey, name: menuKey, categoryId, restaurantIds: [restaurantId] };
}

describe("selectCandidatesWithCaps", () => {
  it("상한 내에서 순서대로 targetSize개를 뽑는다", () => {
    const pool = [
      candidate("a", "한식", "r-1"),
      candidate("b", "중식", "r-2"),
      candidate("c", "일식", "r-3"),
      candidate("d", "양식", "r-4"),
    ];
    const result = selectCandidatesWithCaps(pool, { targetSize: 4, maxPerRestaurant: 2, maxPerCategory: 3 });
    expect(result.map((c) => c.menuKey)).toEqual(["a", "b", "c", "d"]);
  });

  it("같은 식당 메뉴가 상한을 넘으면 건너뛴다", () => {
    const pool = [
      candidate("a", "한식", "r-1"),
      candidate("b", "중식", "r-1"),
      candidate("c", "일식", "r-1"), // r-1은 이미 2개라 상한(2) 초과로 제외
      candidate("d", "양식", "r-2"),
    ];
    const result = selectCandidatesWithCaps(pool, { targetSize: 3, maxPerRestaurant: 2, maxPerCategory: 3 });
    expect(result.map((c) => c.menuKey)).toEqual(["a", "b", "d"]);
  });

  it("같은 카테고리가 상한을 넘으면 건너뛴다", () => {
    const pool = [
      candidate("a", "한식", "r-1"),
      candidate("b", "한식", "r-2"),
      candidate("c", "한식", "r-3"), // 한식은 이미 2개라 상한(2) 초과로 제외
      candidate("d", "중식", "r-4"),
    ];
    const result = selectCandidatesWithCaps(pool, { targetSize: 3, maxPerRestaurant: 2, maxPerCategory: 2 });
    expect(result.map((c) => c.menuKey)).toEqual(["a", "b", "d"]);
  });
});

describe("resolveTournamentSize", () => {
  it("8개 이상이면 8강으로 시작한다", () => {
    expect(resolveTournamentSize(10)).toBe(8);
    expect(resolveTournamentSize(8)).toBe(8);
  });

  it("4개 이상 8개 미만이면 4강으로 시작한다", () => {
    expect(resolveTournamentSize(7)).toBe(4);
    expect(resolveTournamentSize(4)).toBe(4);
  });

  it("4개 미만이면 시작할 수 없다", () => {
    expect(resolveTournamentSize(3)).toBeNull();
    expect(resolveTournamentSize(0)).toBeNull();
  });
});
