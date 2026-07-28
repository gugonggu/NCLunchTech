import { describe, expect, it } from "vitest";
import { getSeoulCutoffToday, isWithinWorldcupWinnerSelectionWindow } from "./winner-selection";

describe("getSeoulCutoffToday", () => {
  it("KST 정오(UTC 03:00)에 조회하면 같은 날 17시 KST(UTC 08:00)를 반환한다", () => {
    const now = new Date("2026-07-28T03:00:00.000Z"); // 2026-07-28 12:00 KST
    const cutoff = getSeoulCutoffToday(now, 17);
    expect(cutoff.toISOString()).toBe("2026-07-28T08:00:00.000Z");
  });

  it("자정 직후(KST 00:30)에 조회해도 같은 KST 날짜의 17시를 반환한다", () => {
    const now = new Date("2026-07-27T15:30:00.000Z"); // 2026-07-28 00:30 KST
    const cutoff = getSeoulCutoffToday(now, 17);
    expect(cutoff.toISOString()).toBe("2026-07-28T08:00:00.000Z");
  });
});

describe("isWithinWorldcupWinnerSelectionWindow", () => {
  it("17시 이전이면 true다", () => {
    expect(isWithinWorldcupWinnerSelectionWindow(new Date("2026-07-28T07:59:00.000Z"))).toBe(true);
  });

  it("정확히 17시면 true(경계 포함)다", () => {
    expect(isWithinWorldcupWinnerSelectionWindow(new Date("2026-07-28T08:00:00.000Z"))).toBe(true);
  });

  it("17시 이후면 false다", () => {
    expect(isWithinWorldcupWinnerSelectionWindow(new Date("2026-07-28T08:00:01.000Z"))).toBe(false);
  });
});
