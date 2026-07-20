import { describe, expect, it } from "vitest";
import {
  dedupeIds,
  getWinningOptionIds,
  isPollStatusCode,
  sanitizeCustomLabels,
  shouldLazyClose,
} from "./validation";

describe("shouldLazyClose", () => {
  const now = new Date("2026-07-20T03:00:00.000Z");

  it("open 상태이고 마감시각이 지났으면 true", () => {
    expect(shouldLazyClose("open", new Date("2026-07-20T02:00:00.000Z"), now)).toBe(true);
  });

  it("open 상태이고 마감시각이 아직 안 지났으면 false", () => {
    expect(shouldLazyClose("open", new Date("2026-07-20T04:00:00.000Z"), now)).toBe(false);
  });

  it("마감시각이 정확히 현재 시각이면 지난 것으로 취급한다", () => {
    expect(shouldLazyClose("open", now, now)).toBe(true);
  });

  it("이미 closed/decided면 항상 false", () => {
    expect(shouldLazyClose("closed", new Date("2026-07-20T02:00:00.000Z"), now)).toBe(false);
    expect(shouldLazyClose("decided", new Date("2026-07-20T02:00:00.000Z"), now)).toBe(false);
  });
});

describe("getWinningOptionIds", () => {
  it("득표가 하나도 없으면 빈 배열", () => {
    expect(
      getWinningOptionIds([
        { optionId: "a", voteCount: 0 },
        { optionId: "b", voteCount: 0 },
      ])
    ).toEqual([]);
  });

  it("단독 최다 득표면 그 선택지 하나만 반환", () => {
    expect(
      getWinningOptionIds([
        { optionId: "a", voteCount: 3 },
        { optionId: "b", voteCount: 1 },
      ])
    ).toEqual(["a"]);
  });

  it("동점이면 공동 1위 전부 반환", () => {
    expect(
      getWinningOptionIds([
        { optionId: "a", voteCount: 2 },
        { optionId: "b", voteCount: 2 },
        { optionId: "c", voteCount: 1 },
      ])
    ).toEqual(["a", "b"]);
  });

  it("선택지가 없으면 빈 배열", () => {
    expect(getWinningOptionIds([])).toEqual([]);
  });
});

describe("isPollStatusCode", () => {
  it("허용 목록에 있는 값만 통과한다", () => {
    expect(isPollStatusCode("created")).toBe(true);
    expect(isPollStatusCode("아무거나")).toBe(false);
    expect(isPollStatusCode(undefined)).toBe(false);
  });
});

describe("dedupeIds", () => {
  it("중복과 빈 값을 제거한다", () => {
    expect(dedupeIds(["a", "b", "a", "", "  ", "c"])).toEqual(["a", "b", "c"]);
  });

  it("빈 배열은 빈 배열", () => {
    expect(dedupeIds([])).toEqual([]);
  });
});

describe("sanitizeCustomLabels", () => {
  it("공백 제거, 빈 값 제거, 중복 제거", () => {
    expect(sanitizeCustomLabels(["  오늘의 특선  ", "", "  ", "오늘의 특선", "다른 메뉴"])).toEqual([
      "오늘의 특선",
      "다른 메뉴",
    ]);
  });

  it("길이 제한을 초과하면 제거한다", () => {
    const tooLong = "a".repeat(51);
    expect(sanitizeCustomLabels([tooLong, "정상"])).toEqual(["정상"]);
  });
});
