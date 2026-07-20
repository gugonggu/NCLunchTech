import { describe, expect, it } from "vitest";
import { isPastConfirmationWindow } from "./confirmation-window";

describe("isPastConfirmationWindow", () => {
  const reference = new Date("2026-07-20T03:00:00.000Z");

  it("확인 가능 시점 1ms 전이면 false", () => {
    const now = new Date("2026-07-20T03:59:59.999Z");
    expect(isPastConfirmationWindow(reference, now)).toBe(false);
  });

  it("정확히 1시간 후면 true", () => {
    expect(isPastConfirmationWindow(reference, new Date("2026-07-20T04:00:00.000Z"))).toBe(true);
  });

  it("확인 가능 시점 1ms 후면 true", () => {
    const now = new Date("2026-07-20T04:00:00.001Z");
    expect(isPastConfirmationWindow(reference, now)).toBe(true);
  });
});
