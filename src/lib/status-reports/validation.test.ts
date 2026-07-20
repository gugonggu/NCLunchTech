import { describe, expect, it } from "vitest";
import {
  formatMinutesAgo,
  isReportFresh,
  isValidReportValue,
  shouldEditExistingReport,
} from "./validation";

describe("isValidReportValue", () => {
  it("혼잡도는 한산/보통/혼잡만 허용한다", () => {
    expect(isValidReportValue("congestion", "혼잡")).toBe(true);
    expect(isValidReportValue("congestion", "영업 중")).toBe(false);
  });

  it("영업 상태는 지정된 4개 값만 허용한다", () => {
    expect(isValidReportValue("business_status", "재료 소진")).toBe(true);
    expect(isValidReportValue("business_status", "혼잡")).toBe(false);
  });
});

describe("isReportFresh", () => {
  const now = new Date("2026-07-20T03:00:00.000Z"); // 2026-07-20 12:00 KST

  it("혼잡도는 60분 이내면 신선하다(경계값 포함)", () => {
    expect(isReportFresh("congestion", new Date("2026-07-20T02:00:00.000Z"), now)).toBe(true);
  });

  it("혼잡도는 60분을 초과하면 신선하지 않다", () => {
    expect(isReportFresh("congestion", new Date("2026-07-20T01:59:00.000Z"), now)).toBe(false);
  });

  it("영업 상태는 180분 이내면 신선하다(경계값 포함)", () => {
    expect(isReportFresh("business_status", new Date("2026-07-20T00:00:00.000Z"), now)).toBe(true);
  });

  it("영업 상태는 180분을 초과하면 신선하지 않다", () => {
    expect(isReportFresh("business_status", new Date("2026-07-19T23:59:00.000Z"), now)).toBe(false);
  });

  it("유효 시간 이내여도 자정이 지났으면(Asia/Seoul 날짜가 바뀌었으면) 신선하지 않다", () => {
    // 2026-07-19 23:50 KST 제보, 지금은 2026-07-20 00:10 KST (20분 차이, 60분 이내지만 날짜가 바뀜)
    const midnightNow = new Date("2026-07-19T15:10:00.000Z");
    const beforeMidnight = new Date("2026-07-19T14:50:00.000Z");
    expect(isReportFresh("congestion", beforeMidnight, midnightNow)).toBe(false);
  });

  it("미래 시각(created_at > now)은 신선하지 않다", () => {
    expect(isReportFresh("congestion", new Date("2026-07-20T03:30:00.000Z"), now)).toBe(false);
  });
});

describe("shouldEditExistingReport", () => {
  const now = new Date("2026-07-20T03:00:00.000Z");

  it("10분 이내 직전 제보는 수정 대상이다(경계값 포함)", () => {
    expect(shouldEditExistingReport(new Date("2026-07-20T02:50:00.000Z"), now)).toBe(true);
  });

  it("10분을 초과하면 새 제보로 취급한다", () => {
    expect(shouldEditExistingReport(new Date("2026-07-20T02:49:00.000Z"), now)).toBe(false);
  });
});

describe("formatMinutesAgo", () => {
  const now = new Date("2026-07-20T03:00:00.000Z");

  it("1분 미만이면 방금 전", () => {
    expect(formatMinutesAgo(new Date("2026-07-20T02:59:30.000Z"), now)).toBe("방금 전");
  });

  it("60분 미만이면 N분 전", () => {
    expect(formatMinutesAgo(new Date("2026-07-20T02:45:00.000Z"), now)).toBe("15분 전");
  });

  it("정각 시간이면 H시간 전", () => {
    expect(formatMinutesAgo(new Date("2026-07-20T01:00:00.000Z"), now)).toBe("2시간 전");
  });

  it("60분 이상이면 H시간 N분 전", () => {
    expect(formatMinutesAgo(new Date("2026-07-20T01:10:00.000Z"), now)).toBe("1시간 50분 전");
  });
});
