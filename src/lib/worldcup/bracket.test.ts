import { describe, expect, it } from "vitest";
import { buildFirstRoundMatches, buildNextRoundMatches, extractRoundWinnersIfComplete, getRoundLabel } from "./bracket";

describe("buildFirstRoundMatches", () => {
  it("8개 후보를 순서대로 4경기로 짝짓는다", () => {
    const result = buildFirstRoundMatches(["a", "b", "c", "d", "e", "f", "g", "h"]);
    expect(result).toEqual([
      { matchIndex: 0, leftMenuKey: "a", rightMenuKey: "b" },
      { matchIndex: 1, leftMenuKey: "c", rightMenuKey: "d" },
      { matchIndex: 2, leftMenuKey: "e", rightMenuKey: "f" },
      { matchIndex: 3, leftMenuKey: "g", rightMenuKey: "h" },
    ]);
  });

  it("4개 후보는 2경기로 짝짓는다", () => {
    const result = buildFirstRoundMatches(["a", "b", "c", "d"]);
    expect(result).toEqual([
      { matchIndex: 0, leftMenuKey: "a", rightMenuKey: "b" },
      { matchIndex: 1, leftMenuKey: "c", rightMenuKey: "d" },
    ]);
  });
});

describe("buildNextRoundMatches", () => {
  it("승자 4명이면 다음 라운드(4강) 2경기를 만든다", () => {
    const result = buildNextRoundMatches(["a", "c", "e", "g"]);
    expect(result).toEqual([
      { matchIndex: 0, leftMenuKey: "a", rightMenuKey: "c" },
      { matchIndex: 1, leftMenuKey: "e", rightMenuKey: "g" },
    ]);
  });

  it("승자 2명이면 결승 1경기를 만든다", () => {
    const result = buildNextRoundMatches(["a", "e"]);
    expect(result).toEqual([{ matchIndex: 0, leftMenuKey: "a", rightMenuKey: "e" }]);
  });

  it("승자가 1명이면 우승자가 결정된 것이므로 null이다", () => {
    expect(buildNextRoundMatches(["a"])).toBeNull();
  });
});

describe("extractRoundWinnersIfComplete", () => {
  it("모든 경기가 선택됐으면 match_index 순서로 승자를 반환한다", () => {
    const result = extractRoundWinnersIfComplete([
      { matchIndex: 1, selectedMenuKey: "d" },
      { matchIndex: 0, selectedMenuKey: "b" },
    ]);
    expect(result).toEqual(["b", "d"]);
  });

  it("아직 선택되지 않은 경기가 있으면 null이다", () => {
    const result = extractRoundWinnersIfComplete([
      { matchIndex: 0, selectedMenuKey: "b" },
      { matchIndex: 1, selectedMenuKey: null },
    ]);
    expect(result).toBeNull();
  });
});

describe("getRoundLabel", () => {
  it("8강 토너먼트의 라운드별 표시 문구", () => {
    expect(getRoundLabel(1, 8)).toBe("8강");
    expect(getRoundLabel(2, 8)).toBe("4강");
    expect(getRoundLabel(3, 8)).toBe("결승");
  });

  it("4강 토너먼트의 라운드별 표시 문구", () => {
    expect(getRoundLabel(1, 4)).toBe("4강");
    expect(getRoundLabel(2, 4)).toBe("결승");
  });
});
