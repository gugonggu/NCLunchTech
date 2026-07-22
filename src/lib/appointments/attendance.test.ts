import { describe, expect, it } from "vitest";
import { getAttendanceTiming } from "./attendance";

describe("getAttendanceTiming", () => {
  it("allows attendance immediately before the scheduled time", () => {
    expect(getAttendanceTiming("2026-07-20T03:00:00.000Z", new Date("2026-07-20T02:00:00.000Z"))).toBe("allowed");
  });

  it("does not use the timestamp as an eligibility gate", () => {
    expect(getAttendanceTiming("invalid", new Date("2026-07-20T03:00:00.000Z"))).toBe("allowed");
  });
});
