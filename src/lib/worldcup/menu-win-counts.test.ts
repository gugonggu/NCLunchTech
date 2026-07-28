import { describe, expect, it } from "vitest";
import { countWinsPerMenuKey } from "./menu-win-counts";

describe("countWinsPerMenuKey", () => {
  it("우승 메뉴별 횟수를 센다", () => {
    const result = countWinsPerMenuKey([
      { winnerMenuKey: "돈까스" },
      { winnerMenuKey: "돈까스" },
      { winnerMenuKey: "김치찌개" },
    ]);
    expect(result).toEqual(new Map([["돈까스", 2], ["김치찌개", 1]]));
  });

  it("완료된 세션이 없으면 빈 Map이다", () => {
    expect(countWinsPerMenuKey([])).toEqual(new Map());
  });
});
