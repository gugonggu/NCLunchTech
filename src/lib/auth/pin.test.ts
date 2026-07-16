import { describe, expect, it } from "vitest";
import { hashPin, verifyPin } from "./pin";

describe("PIN 해시", () => {
  it("올바른 PIN은 검증에 성공한다", async () => {
    const hash = await hashPin("1234");
    expect(await verifyPin("1234", hash)).toBe(true);
  });

  it("틀린 PIN은 검증에 실패한다", async () => {
    const hash = await hashPin("1234");
    expect(await verifyPin("9999", hash)).toBe(false);
  });

  it("같은 PIN이라도 매번 다른 해시를 생성한다", async () => {
    const hashA = await hashPin("1234");
    const hashB = await hashPin("1234");
    expect(hashA).not.toBe(hashB);
  });
});
