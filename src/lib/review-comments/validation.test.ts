import { describe, expect, it } from "vitest";
import { commentContentSchema, isCommentStatusCode } from "./validation";

describe("commentContentSchema", () => {
  it("빈 값은 거부한다", () => {
    expect(commentContentSchema.safeParse("").success).toBe(false);
    expect(commentContentSchema.safeParse("   ").success).toBe(false);
  });

  it("300자 이하는 통과한다", () => {
    expect(commentContentSchema.safeParse("좋아요!").success).toBe(true);
    expect(commentContentSchema.safeParse("a".repeat(300)).success).toBe(true);
  });

  it("300자를 초과하면 거부한다", () => {
    expect(commentContentSchema.safeParse("a".repeat(301)).success).toBe(false);
  });

  it("앞뒤 공백은 제거한다", () => {
    const result = commentContentSchema.safeParse("  안녕하세요  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("안녕하세요");
    }
  });
});

describe("isCommentStatusCode", () => {
  it("허용 목록에 있는 값만 통과한다", () => {
    expect(isCommentStatusCode("created")).toBe(true);
    expect(isCommentStatusCode("아무거나")).toBe(false);
    expect(isCommentStatusCode(undefined)).toBe(false);
  });
});
