import { describe, expect, it } from "vitest";
import { isReportStatusCode, reportReasonSchema } from "./validation";

describe("reportReasonSchema", () => {
  it("빈 값은 거부한다", () => {
    expect(reportReasonSchema.safeParse("").success).toBe(false);
    expect(reportReasonSchema.safeParse("   ").success).toBe(false);
  });

  it("200자 이하 사유는 통과한다", () => {
    expect(reportReasonSchema.safeParse("허위 정보 같아요").success).toBe(true);
  });

  it("200자를 넘으면 거부한다", () => {
    expect(reportReasonSchema.safeParse("a".repeat(201)).success).toBe(false);
  });
});

describe("isReportStatusCode", () => {
  it("허용 목록에 있는 값만 통과한다", () => {
    expect(isReportStatusCode("submitted")).toBe(true);
    expect(isReportStatusCode("아무거나")).toBe(false);
    expect(isReportStatusCode(undefined)).toBe(false);
  });
});
