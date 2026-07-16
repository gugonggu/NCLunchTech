import { describe, expect, it } from "vitest";
import { adminLoginSchema } from "./admin-validation";

describe("adminLoginSchema", () => {
  it("올바른 이메일과 비밀번호는 통과한다", () => {
    const result = adminLoginSchema.safeParse({ email: "admin@example.com", password: "secret" });
    expect(result.success).toBe(true);
  });

  it("이메일 형식이 아니면 실패한다", () => {
    const result = adminLoginSchema.safeParse({ email: "not-an-email", password: "secret" });
    expect(result.success).toBe(false);
  });

  it("비밀번호가 비어 있으면 실패한다", () => {
    const result = adminLoginSchema.safeParse({ email: "admin@example.com", password: "" });
    expect(result.success).toBe(false);
  });
});
