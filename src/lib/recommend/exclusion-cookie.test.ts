import { describe, expect, it } from "vitest";
import {
  MAX_EXCLUSION_ENTRIES,
  addExclusion,
  intersectWithCandidates,
  nextSeoulMidnight,
  parseExclusionList,
} from "./exclusion-cookie";

const ID_A = "00000000-0000-4000-8000-000000000001";
const ID_B = "00000000-0000-4000-8000-000000000002";
const ID_C = "11111111-1111-4111-8111-111111111111";

describe("parseExclusionList", () => {
  it("정상적인 UUID 배열은 그대로 반환한다", () => {
    expect(parseExclusionList(JSON.stringify([ID_A, ID_B]))).toEqual([ID_A, ID_B]);
  });

  it("값이 없으면 빈 배열이다", () => {
    expect(parseExclusionList(undefined)).toEqual([]);
  });

  it("JSON 형식이 깨져도 예외 없이 빈 배열로 초기화한다", () => {
    expect(parseExclusionList("{이상한값")).toEqual([]);
  });

  it("배열이 아닌 JSON은 빈 배열로 초기화한다", () => {
    expect(parseExclusionList(JSON.stringify({ a: 1 }))).toEqual([]);
  });

  it("UUID 형식이 아닌 항목은 걸러낸다", () => {
    expect(parseExclusionList(JSON.stringify([ID_A, "not-a-uuid", 123]))).toEqual([ID_A]);
  });

  it("중복된 id는 하나만 남긴다", () => {
    expect(parseExclusionList(JSON.stringify([ID_A, ID_A, ID_B]))).toEqual([ID_A, ID_B]);
  });
});

describe("addExclusion", () => {
  it("새 id를 목록 끝에 추가한다", () => {
    expect(addExclusion([ID_A], ID_B)).toEqual([ID_A, ID_B]);
  });

  it("UUID 형식이 아니면 목록을 그대로 반환한다", () => {
    expect(addExclusion([ID_A], "not-a-uuid")).toEqual([ID_A]);
  });

  it("이미 있는 id를 다시 추가하면 중복 없이 맨 뒤로 옮긴다", () => {
    expect(addExclusion([ID_A, ID_B], ID_A)).toEqual([ID_B, ID_A]);
  });

  it("50개를 넘으면 가장 오래된 항목부터 제거해 50개를 유지한다", () => {
    const full = Array.from({ length: MAX_EXCLUSION_ENTRIES }, (_, i) =>
      `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`
    );
    const result = addExclusion(full, ID_C);
    expect(result.length).toBe(MAX_EXCLUSION_ENTRIES);
    expect(result[result.length - 1]).toBe(ID_C);
    expect(result).not.toContain(full[0]);
  });
});

describe("intersectWithCandidates", () => {
  it("현재 후보 목록에 있는 id만 남긴다", () => {
    expect(intersectWithCandidates([ID_A, ID_B, ID_C], [ID_A, ID_C])).toEqual([ID_A, ID_C]);
  });
});

describe("nextSeoulMidnight", () => {
  it("서울 기준 낮 시간이면 같은 날 다음 자정(UTC 15:00)을 반환한다", () => {
    // 2026-07-16 03:00 UTC = 2026-07-16 12:00 KST
    const now = new Date("2026-07-16T03:00:00.000Z");
    const result = nextSeoulMidnight(now);
    // 2026-07-17 00:00 KST = 2026-07-16 15:00 UTC
    expect(result.toISOString()).toBe("2026-07-16T15:00:00.000Z");
  });

  it("서울 기준 자정 직전이어도 다음 날 자정을 반환한다", () => {
    // 2026-07-16 14:59 UTC = 2026-07-16 23:59 KST
    const now = new Date("2026-07-16T14:59:00.000Z");
    const result = nextSeoulMidnight(now);
    expect(result.toISOString()).toBe("2026-07-16T15:00:00.000Z");
  });
});
