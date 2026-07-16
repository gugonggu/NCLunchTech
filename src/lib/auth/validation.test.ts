import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema } from "./validation";

describe("signupSchema", () => {
  it("올바른 입력은 통과한다", () => {
    const result = signupSchema.safeParse({
      inviteCode: "abc123",
      nickname: "홍길동",
      pin: "1234",
      pinConfirm: "1234",
    });
    expect(result.success).toBe(true);
  });

  it("PIN과 PIN 확인이 다르면 실패한다", () => {
    const result = signupSchema.safeParse({
      inviteCode: "abc123",
      nickname: "홍길동",
      pin: "1234",
      pinConfirm: "4321",
    });
    expect(result.success).toBe(false);
  });

  it("PIN이 4자리 숫자가 아니면 실패한다", () => {
    const result = signupSchema.safeParse({
      inviteCode: "abc123",
      nickname: "홍길동",
      pin: "12a4",
      pinConfirm: "12a4",
    });
    expect(result.success).toBe(false);
  });

  it("닉네임에 공백이나 특수문자가 있으면 실패한다", () => {
    const result = signupSchema.safeParse({
      inviteCode: "abc123",
      nickname: "홍 길동!",
      pin: "1234",
      pinConfirm: "1234",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("올바른 입력은 통과한다", () => {
    const result = loginSchema.safeParse({ nickname: "홍길동", pin: "1234" });
    expect(result.success).toBe(true);
  });

  it("PIN 형식이 잘못되면 실패한다", () => {
    const result = loginSchema.safeParse({ nickname: "홍길동", pin: "12345" });
    expect(result.success).toBe(false);
  });
});
