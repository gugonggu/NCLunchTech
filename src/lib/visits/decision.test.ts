import { describe, expect, it } from "vitest";
import { decideOutcome } from "./decision";

describe("decideOutcome", () => {
  it("오늘 planned 방문이 없으면 insert한다", () => {
    expect(decideOutcome(null, "r-1")).toEqual({ action: "insert" });
  });

  it("같은 식당을 다시 선택하면 already_decided(중복 생성 없음)", () => {
    const existing = { id: "v-1", restaurantId: "r-1" };
    expect(decideOutcome(existing, "r-1")).toEqual({ action: "already_decided", visitId: "v-1" });
  });

  it("다른 식당을 선택하면 기존 행의 식당을 변경한다", () => {
    const existing = { id: "v-1", restaurantId: "r-1" };
    expect(decideOutcome(existing, "r-2")).toEqual({ action: "update_restaurant", visitId: "v-1" });
  });
});
