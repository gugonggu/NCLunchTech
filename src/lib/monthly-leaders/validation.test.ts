import { describe, expect, it } from "vitest";
import { monthlyLeaderboardMonthSchema } from "./validation";

describe("monthlyLeaderboardMonthSchema", () => {
  it("accepts a canonical YYYY-MM value and derives its first-day key", () => {
    expect(monthlyLeaderboardMonthSchema.parse("2026-07")).toBe("2026-07-01");
  });

  it("rejects non-canonical or impossible months", () => {
    expect(monthlyLeaderboardMonthSchema.safeParse("2026-7").success).toBe(false);
    expect(monthlyLeaderboardMonthSchema.safeParse("2026-13").success).toBe(false);
  });
});
