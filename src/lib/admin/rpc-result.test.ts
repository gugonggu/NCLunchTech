import { describe, expect, it } from "vitest";
import { parseAdminRpcObjectStatus, parseAdminRpcStatus, parseCsvApplyRpcResult } from "./rpc-result";

describe("parseAdminRpcStatus", () => {
  it("허용된 문자열 상태만 반환한다", () => {
    expect(parseAdminRpcStatus("pin_reset", ["pin_reset", "target_not_found"])).toBe("pin_reset");
  });

  it("객체나 허용 목록 밖 문자열은 거부한다", () => {
    expect(() => parseAdminRpcStatus({ status: "pin_reset" }, ["pin_reset"])).toThrow();
    expect(() => parseAdminRpcStatus("internal_error", ["pin_reset"])).toThrow();
  });
});

describe("parseAdminRpcObjectStatus", () => {
  it("허용된 객체 status만 반환한다", () => {
    expect(parseAdminRpcObjectStatus({ status: "review_deleted" }, ["review_deleted", "target_not_found"])).toBe(
      "review_deleted"
    );
  });

  it("객체가 아니거나 status가 허용 목록 밖이면 거부한다", () => {
    expect(() => parseAdminRpcObjectStatus("review_deleted", ["review_deleted"])).toThrow();
    expect(() => parseAdminRpcObjectStatus({ status: "unknown" }, ["review_deleted"])).toThrow();
  });
});

describe("parseCsvApplyRpcResult", () => {
  it("적용 결과의 타입과 건수를 검증한다", () => {
    expect(parseCsvApplyRpcResult({ status: "applied", type: "menu", appliedCount: 2 })).toEqual({
      status: "applied",
      type: "menu",
      appliedCount: 2,
    });
  });

  it("적용되지 않은 안정된 상태를 허용한다", () => {
    expect(parseCsvApplyRpcResult({ status: "already_applied" })).toEqual({ status: "already_applied" });
  });

  it("적용 성공에 타입·건수가 없거나 알 수 없는 상태면 거부한다", () => {
    expect(() => parseCsvApplyRpcResult({ status: "applied" })).toThrow();
    expect(() => parseCsvApplyRpcResult({ status: "apply_failed" })).toThrow();
  });
});
