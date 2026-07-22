import { describe, expect, it } from "vitest";
import { loginSchema, profileSchema, signupSchema } from "./validation";

describe("signupSchema", () => {
  it("accepts valid signup input including real name", () => {
    const result = signupSchema.safeParse({
      inviteCode: "abc123",
      realName: "홍길동",
      nickname: "점심이",
      pin: "1234",
      pinConfirm: "1234",
    });
    expect(result.success).toBe(true);
  });

  it("rejects signup without real name", () => {
    const result = signupSchema.safeParse({
      inviteCode: "abc123",
      nickname: "점심이",
      pin: "1234",
      pinConfirm: "1234",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched PIN confirmation", () => {
    const result = signupSchema.safeParse({
      inviteCode: "abc123",
      realName: "홍길동",
      nickname: "점심이",
      pin: "1234",
      pinConfirm: "4321",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non 4-digit PIN", () => {
    const result = signupSchema.safeParse({
      inviteCode: "abc123",
      realName: "홍길동",
      nickname: "점심이",
      pin: "12a4",
      pinConfirm: "12a4",
    });
    expect(result.success).toBe(false);
  });

  it("rejects nickname with spaces or special characters", () => {
    const result = signupSchema.safeParse({
      inviteCode: "abc123",
      realName: "홍길동",
      nickname: "홍 길동!",
      pin: "1234",
      pinConfirm: "1234",
    });
    expect(result.success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("accepts editable profile names", () => {
    const result = profileSchema.safeParse({ realName: "홍길동", nickname: "점심이" });
    expect(result.success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("accepts valid login input", () => {
    const result = loginSchema.safeParse({ nickname: "점심이", pin: "1234" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid PIN format", () => {
    const result = loginSchema.safeParse({ nickname: "점심이", pin: "12345" });
    expect(result.success).toBe(false);
  });
});
