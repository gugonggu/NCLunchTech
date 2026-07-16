import { afterEach, describe, expect, it } from "vitest";
import { getServerEnv } from "./env";

const REQUIRED_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("getServerEnv", () => {
  it("필수 환경변수가 하나라도 없으면 예외를 던진다", () => {
    for (const key of REQUIRED_KEYS) {
      delete process.env[key];
    }

    expect(() => getServerEnv()).toThrow();
  });

  it("필수 환경변수가 모두 있으면 값을 그대로 반환한다", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    const env = getServerEnv();

    expect(env).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    });
  });
});
