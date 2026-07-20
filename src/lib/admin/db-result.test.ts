import { describe, expect, it } from "vitest";
import { requireAffectedRow, requireQueryData, requireQuerySuccess } from "./db-result";

const dbError = { message: "internal database detail" };

describe("requireQuerySuccess", () => {
  it("Supabase 오류를 내부 정보가 없는 일반 오류로 바꾼다", () => {
    expect(() => requireQuerySuccess(dbError, "저장에 실패했습니다.")).toThrow("저장에 실패했습니다.");
    expect(() => requireQuerySuccess(dbError, "저장에 실패했습니다.")).not.toThrow("internal database detail");
  });
});

describe("requireQueryData", () => {
  it("데이터가 null이면 실패한다", () => {
    expect(() => requireQueryData(null, null, "조회에 실패했습니다.")).toThrow("조회에 실패했습니다.");
  });

  it("오류가 없으면 데이터를 반환한다", () => {
    expect(requireQueryData({ id: "value" }, null, "조회에 실패했습니다.")).toEqual({ id: "value" });
  });
});

describe("requireAffectedRow", () => {
  it("영향 행이 없으면 대상 없음 오류를 반환한다", () => {
    expect(() => requireAffectedRow(null, null, "대상이 없습니다.", "저장에 실패했습니다.")).toThrow(
      "대상이 없습니다."
    );
  });

  it("Supabase 오류가 있으면 저장 오류를 반환한다", () => {
    expect(() => requireAffectedRow(null, dbError, "대상이 없습니다.", "저장에 실패했습니다.")).toThrow(
      "저장에 실패했습니다."
    );
  });
});
