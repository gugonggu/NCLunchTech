import { describe, expect, it } from "vitest";
import { getAttendanceTiming } from "./attendance";

describe("getAttendanceTiming", () => {
  const scheduledAt = "2026-07-20T03:00:00.000Z";

  it("예정 시각 1시간 후 1ms 전에는 방문 확인을 거부한다", () => {
    expect(getAttendanceTiming(scheduledAt, new Date("2026-07-20T03:59:59.999Z"))).toBe("too_early");
  });

  it("정확히 예정 시각 1시간 후부터 방문 확인을 허용한다", () => {
    expect(getAttendanceTiming(scheduledAt, new Date("2026-07-20T04:00:00.000Z"))).toBe("allowed");
  });

  it("예정 시각 1시간 후 1ms가 지나도 방문 확인을 허용한다", () => {
    expect(getAttendanceTiming(scheduledAt, new Date("2026-07-20T04:00:00.001Z"))).toBe("allowed");
  });

  it("손상된 예정 시각은 허용하지 않는다", () => {
    expect(getAttendanceTiming("invalid", new Date("2026-07-20T03:00:00.000Z"))).toBe("too_early");
  });
});
