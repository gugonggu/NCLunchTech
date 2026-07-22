import { describe, expect, it } from "vitest";
import { canTransition, daysBetweenDateStrings, getCancelledVisitUpdate, getSeoulDateString, isVisitFeedbackCode } from "./validation";

describe("getSeoulDateString", () => {
  it("calculates the date using Asia/Seoul time", () => {
    expect(getSeoulDateString(new Date("2026-07-16T03:00:00.000Z"))).toBe("2026-07-16");
  });

  it("rolls over at midnight in Asia/Seoul", () => {
    expect(getSeoulDateString(new Date("2026-07-16T14:59:00.000Z"))).toBe("2026-07-16");
    expect(getSeoulDateString(new Date("2026-07-16T15:00:00.000Z"))).toBe("2026-07-17");
  });
});

describe("canTransition", () => {
  it("allows planned visits to become completed or cancelled", () => {
    expect(canTransition("planned", "completed")).toBe(true);
    expect(canTransition("planned", "cancelled")).toBe(true);
  });

  it("allows completed visits to be cancelled when the visit was marked by mistake", () => {
    expect(canTransition("completed", "planned")).toBe(false);
    expect(canTransition("completed", "cancelled")).toBe(true);
  });

  it("does not reopen cancelled visits", () => {
    expect(canTransition("cancelled", "planned")).toBe(false);
    expect(canTransition("cancelled", "completed")).toBe(false);
  });
});

describe("getCancelledVisitUpdate", () => {
  it("clears completion time while cancelling a completed visit", () => {
    expect(getCancelledVisitUpdate("2026-07-23T03:30:00.000Z")).toEqual({
      status: "cancelled",
      cancelled_at: "2026-07-23T03:30:00.000Z",
      completed_at: null,
      updated_at: "2026-07-23T03:30:00.000Z",
    });
  });
});

describe("daysBetweenDateStrings", () => {
  it("returns 0 for the same date", () => {
    expect(daysBetweenDateStrings("2026-07-16", "2026-07-16")).toBe(0);
  });

  it("returns a positive number when the first date is later", () => {
    expect(daysBetweenDateStrings("2026-07-16", "2026-07-02")).toBe(14);
  });

  it("returns a negative number when the first date is earlier", () => {
    expect(daysBetweenDateStrings("2026-07-02", "2026-07-16")).toBe(-14);
  });
});

describe("isVisitFeedbackCode", () => {
  it("accepts only known feedback codes", () => {
    expect(isVisitFeedbackCode("decided")).toBe(true);
    expect(isVisitFeedbackCode("already_completed")).toBe(true);
  });

  it("rejects unknown arbitrary strings", () => {
    expect(isVisitFeedbackCode("<script>alert(1)</script>")).toBe(false);
    expect(isVisitFeedbackCode("anything")).toBe(false);
    expect(isVisitFeedbackCode(undefined)).toBe(false);
  });
});
