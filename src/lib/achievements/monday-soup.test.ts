import { describe, expect, it } from "vitest";
import { isMondaySoupMenuName, isSeoulMonday } from "./monday-soup";

describe("isMondaySoupMenuName", () => {
  it("국밥이 포함되면 true다", () => {
    expect(isMondaySoupMenuName("순대국밥")).toBe(true);
  });

  it("탕이 포함되면 true다", () => {
    expect(isMondaySoupMenuName("설렁탕")).toBe(true);
  });

  it("찌개가 포함되면 true다", () => {
    expect(isMondaySoupMenuName("김치찌개")).toBe(true);
  });

  it("해당 없으면 false다", () => {
    expect(isMondaySoupMenuName("돈까스")).toBe(false);
  });
});

describe("isSeoulMonday", () => {
  it("2026-07-27은 월요일이라 true다", () => {
    expect(isSeoulMonday("2026-07-27")).toBe(true);
  });

  it("2026-07-28은 화요일이라 false다", () => {
    expect(isSeoulMonday("2026-07-28")).toBe(false);
  });
});
