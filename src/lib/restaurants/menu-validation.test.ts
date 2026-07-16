import { describe, expect, it } from "vitest";
import { menuItemSchema } from "./menu-validation";

describe("menuItemSchema", () => {
  it("이름만 있어도 통과한다(가격은 null)", () => {
    const result = menuItemSchema.safeParse({ name: "김치찌개", price: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBeNull();
    }
  });

  it("이름과 가격이 모두 유효하면 통과한다", () => {
    const result = menuItemSchema.safeParse({ name: "김치찌개", price: "8000" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(8000);
    }
  });

  it("이름이 비어 있으면 실패한다", () => {
    const result = menuItemSchema.safeParse({ name: "", price: "8000" });
    expect(result.success).toBe(false);
  });

  it("가격이 숫자가 아니면 실패한다", () => {
    const result = menuItemSchema.safeParse({ name: "김치찌개", price: "만원" });
    expect(result.success).toBe(false);
  });

  it("가격이 음수면 실패한다", () => {
    const result = menuItemSchema.safeParse({ name: "김치찌개", price: "-1000" });
    expect(result.success).toBe(false);
  });
});
