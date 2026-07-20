import { describe, expect, it } from "vitest";
import {
  canParticipantTransition,
  formatSeoulDateTimeLocal,
  getDefaultAppointmentTime,
  isAppointmentStatusCode,
  memoSchema,
  parseNicknameList,
  parseSeoulDateTimeLocal,
  sanitizeReturnTo,
} from "./validation";

describe("getDefaultAppointmentTime", () => {
  it("서울 기준 12:30 이전이면 오늘 12:30을 반환한다", () => {
    // 2026-07-16 02:00 UTC = 2026-07-16 11:00 KST
    const now = new Date("2026-07-16T02:00:00.000Z");
    const result = getDefaultAppointmentTime(now);
    // 2026-07-16 12:30 KST = 2026-07-16 03:30 UTC
    expect(result.toISOString()).toBe("2026-07-16T03:30:00.000Z");
  });

  it("서울 기준 12:30 정각도 '이전'이 아니므로 현재 시각 + 30분을 반환한다", () => {
    // 2026-07-16 03:30 UTC = 2026-07-16 12:30 KST
    const now = new Date("2026-07-16T03:30:00.000Z");
    const result = getDefaultAppointmentTime(now);
    expect(result.toISOString()).toBe("2026-07-16T04:00:00.000Z");
  });

  it("서울 기준 12:30 이후면 현재 시각 + 30분을 반환한다", () => {
    // 2026-07-16 05:00 UTC = 2026-07-16 14:00 KST
    const now = new Date("2026-07-16T05:00:00.000Z");
    const result = getDefaultAppointmentTime(now);
    expect(result.toISOString()).toBe("2026-07-16T05:30:00.000Z");
  });
});

describe("parseSeoulDateTimeLocal / formatSeoulDateTimeLocal", () => {
  it("datetime-local 문자열을 서울 벽시계 시각으로 해석해 정확한 UTC로 변환한다", () => {
    const result = parseSeoulDateTimeLocal("2026-07-16T12:30");
    expect(result?.toISOString()).toBe("2026-07-16T03:30:00.000Z");
  });

  it("형식이 올바르지 않으면 null을 반환한다", () => {
    expect(parseSeoulDateTimeLocal("이상한값")).toBeNull();
    expect(parseSeoulDateTimeLocal("2026-07-16")).toBeNull();
  });

  it("Date와 datetime-local 문자열 사이를 왕복 변환해도 값이 유지된다", () => {
    const original = "2026-07-16T09:05";
    const date = parseSeoulDateTimeLocal(original);
    expect(date).not.toBeNull();
    expect(formatSeoulDateTimeLocal(date as Date)).toBe(original);
  });
});

describe("memoSchema", () => {
  it("100자 이하 메모는 통과한다", () => {
    expect(memoSchema.safeParse("점심 같이 먹어요").success).toBe(true);
  });

  it("100자 초과 메모는 거부한다", () => {
    expect(memoSchema.safeParse("a".repeat(101)).success).toBe(false);
  });

  it("빈 값은 undefined로 통과한다", () => {
    const result = memoSchema.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
  });
});

describe("canParticipantTransition", () => {
  it("pending에서 accepted/declined로 전이할 수 있다", () => {
    expect(canParticipantTransition("pending", "accepted")).toBe(true);
    expect(canParticipantTransition("pending", "declined")).toBe(true);
  });

  it("accepted에서 cancelled(불참)로 전이할 수 있다", () => {
    expect(canParticipantTransition("accepted", "cancelled")).toBe(true);
  });

  it("declined/cancelled는 종결 상태라 더 이상 전이할 수 없다", () => {
    expect(canParticipantTransition("declined", "accepted")).toBe(false);
    expect(canParticipantTransition("cancelled", "accepted")).toBe(false);
  });

  it("accepted에서 declined로는 갈 수 없다(거절은 최초 응답에서만)", () => {
    expect(canParticipantTransition("accepted", "declined")).toBe(false);
  });
});

describe("sanitizeReturnTo", () => {
  it("정상적인 내부 상대경로는 그대로 반환한다", () => {
    expect(sanitizeReturnTo("/appointments/abc-123")).toBe("/appointments/abc-123");
  });

  it("값이 없으면 기본 경로를 반환한다", () => {
    expect(sanitizeReturnTo(undefined)).toBe("/");
    expect(sanitizeReturnTo(null)).toBe("/");
    expect(sanitizeReturnTo("")).toBe("/");
  });

  it("절대 URL이나 프로토콜 상대경로는 기본 경로로 대체한다(오픈 리다이렉트 방지)", () => {
    expect(sanitizeReturnTo("https://evil.com")).toBe("/");
    expect(sanitizeReturnTo("//evil.com")).toBe("/");
    expect(sanitizeReturnTo("evil.com")).toBe("/");
  });

  it("백슬래시가 포함된 값도 기본 경로로 대체한다", () => {
    expect(sanitizeReturnTo("/\\evil.com")).toBe("/");
  });
});

describe("parseNicknameList", () => {
  it("쉼표로 구분된 닉네임을 공백 제거해 배열로 만든다", () => {
    expect(parseNicknameList("김철수, 박영희 ,  이순신")).toEqual(["김철수", "박영희", "이순신"]);
  });

  it("빈 값과 중복은 제거한다", () => {
    expect(parseNicknameList("김철수,, 김철수 ,")).toEqual(["김철수"]);
  });

  it("빈 문자열은 빈 배열이다", () => {
    expect(parseNicknameList("")).toEqual([]);
  });
});

describe("isAppointmentStatusCode", () => {
  it("허용 목록에 있는 값만 통과한다", () => {
    expect(isAppointmentStatusCode("created")).toBe(true);
    expect(isAppointmentStatusCode("아무거나")).toBe(false);
    expect(isAppointmentStatusCode(undefined)).toBe(false);
  });
});
