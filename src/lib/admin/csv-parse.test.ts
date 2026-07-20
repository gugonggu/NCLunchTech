import { describe, expect, it } from "vitest";
import { parseCsvRows } from "./csv-parse";

describe("parseCsvRows", () => {
  it("쉼표로 구분된 일반 행을 파싱한다", () => {
    expect(parseCsvRows("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("따옴표로 감싼 필드 안의 쉼표를 그대로 유지한다", () => {
    expect(parseCsvRows('a,"1,2",b')).toEqual([["a", "1,2", "b"]]);
  });

  it("이스케이프된 따옴표(\"\")를 하나의 따옴표로 해석한다", () => {
    expect(parseCsvRows('a,"say ""hi""",b')).toEqual([["a", 'say "hi"', "b"]]);
  });

  it("CRLF 줄바꿈도 처리한다", () => {
    expect(parseCsvRows("a,b\r\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("빈 문자열은 빈 배열이다", () => {
    expect(parseCsvRows("")).toEqual([]);
  });

  it("마지막에 줄바꿈이 없어도 마지막 행을 포함한다", () => {
    expect(parseCsvRows("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});
