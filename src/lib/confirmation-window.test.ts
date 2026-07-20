import { describe, expect, it } from "vitest";
import { hasAppointmentStarted } from "./confirmation-window";

describe("hasAppointmentStarted", () => {
  const reference = new Date("2026-07-20T03:00:00.000Z");

  it("예정 시각 직전이면 false", () => {
    const now = new Date("2026-07-20T02:59:59.999Z");
    expect(hasAppointmentStarted(reference, now)).toBe(false);
  });

  it("정확히 예정 시각이면 true(경계 포함)", () => {
    expect(hasAppointmentStarted(reference, reference)).toBe(true);
  });

  it("예정 시각이 지났으면 true", () => {
    const now = new Date("2026-07-20T05:00:00.000Z");
    expect(hasAppointmentStarted(reference, now)).toBe(true);
  });
});
