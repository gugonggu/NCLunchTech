import { describe, expect, it } from "vitest";
import { isPastConfirmationWindow } from "./confirmation-window";

describe("isPastConfirmationWindow", () => {
  const reference = new Date("2026-07-20T03:00:00.000Z");

  it("1시간 미만 지났으면 false", () => {
    const now = new Date("2026-07-20T03:59:59.000Z");
    expect(isPastConfirmationWindow(reference, now)).toBe(false);
  });

  it("정확히 1시간 지났으면 true(경계 포함)", () => {
    const now = new Date("2026-07-20T04:00:00.000Z");
    expect(isPastConfirmationWindow(reference, now)).toBe(true);
  });

  it("1시간 넘게 지났으면 true", () => {
    const now = new Date("2026-07-20T05:00:00.000Z");
    expect(isPastConfirmationWindow(reference, now)).toBe(true);
  });

  it("기준 시각 이전(아직 시작 전)이면 false", () => {
    const now = new Date("2026-07-20T02:00:00.000Z");
    expect(isPastConfirmationWindow(reference, now)).toBe(false);
  });
});
