import { describe, expect, it } from "vitest";
import {
  canTransition,
  daysBetweenDateStrings,
  getSeoulDateString,
  isVisitFeedbackCode,
} from "./validation";

describe("getSeoulDateString", () => {
  it("서울 기준 낮 시간의 UTC 시각을 같은 날짜로 계산한다", () => {
    // 2026-07-16 03:00 UTC = 2026-07-16 12:00 KST
    expect(getSeoulDateString(new Date("2026-07-16T03:00:00.000Z"))).toBe("2026-07-16");
  });

  it("서울 기준 자정 직전이면 다음 날짜로 계산한다", () => {
    // 2026-07-16 14:59 UTC = 2026-07-16 23:59 KST
    expect(getSeoulDateString(new Date("2026-07-16T14:59:00.000Z"))).toBe("2026-07-16");
    // 2026-07-16 15:00 UTC = 2026-07-17 00:00 KST
    expect(getSeoulDateString(new Date("2026-07-16T15:00:00.000Z"))).toBe("2026-07-17");
  });
});

describe("canTransition", () => {
  it("planned에서 completed/cancelled로는 허용한다", () => {
    expect(canTransition("planned", "completed")).toBe(true);
    expect(canTransition("planned", "cancelled")).toBe(true);
  });

  it("completed에서는 어떤 상태로도 전이할 수 없다", () => {
    expect(canTransition("completed", "planned")).toBe(false);
    expect(canTransition("completed", "cancelled")).toBe(false);
  });

  it("cancelled에서는 어떤 상태로도 전이할 수 없다(같은 날 새 planned는 새 행으로 생성됨)", () => {
    expect(canTransition("cancelled", "planned")).toBe(false);
    expect(canTransition("cancelled", "completed")).toBe(false);
  });
});

describe("daysBetweenDateStrings", () => {
  it("같은 날짜면 0을 반환한다", () => {
    expect(daysBetweenDateStrings("2026-07-16", "2026-07-16")).toBe(0);
  });

  it("a가 b보다 나중이면 양수를 반환한다", () => {
    expect(daysBetweenDateStrings("2026-07-16", "2026-07-02")).toBe(14);
  });

  it("a가 b보다 이전이면 음수를 반환한다", () => {
    expect(daysBetweenDateStrings("2026-07-02", "2026-07-16")).toBe(-14);
  });
});

describe("isVisitFeedbackCode", () => {
  it("허용 목록에 있는 코드만 통과시킨다", () => {
    expect(isVisitFeedbackCode("decided")).toBe(true);
    expect(isVisitFeedbackCode("already_completed")).toBe(true);
  });

  it("허용 목록에 없는 임의 문자열은 거부한다(사용자가 URL에 임의 문구를 넣는 경우 방어)", () => {
    expect(isVisitFeedbackCode("<script>alert(1)</script>")).toBe(false);
    expect(isVisitFeedbackCode("아무거나")).toBe(false);
    expect(isVisitFeedbackCode(undefined)).toBe(false);
  });
});
