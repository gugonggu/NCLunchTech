import { describe, expect, it } from "vitest";
import {
  getRestaurantReportCategoryLabel,
  isReportStatusCode,
  isRestaurantReportStatusCode,
  reportReasonSchema,
  restaurantReportCategorySchema,
  restaurantReportNoteSchema,
} from "./validation";

describe("reportReasonSchema", () => {
  it("빈 값은 거부한다", () => {
    expect(reportReasonSchema.safeParse("").success).toBe(false);
    expect(reportReasonSchema.safeParse("   ").success).toBe(false);
  });

  it("200자 이하 사유는 통과한다", () => {
    expect(reportReasonSchema.safeParse("허위 정보 같아요").success).toBe(true);
  });

  it("200자를 넘으면 거부한다", () => {
    expect(reportReasonSchema.safeParse("a".repeat(201)).success).toBe(false);
  });
});

describe("isReportStatusCode", () => {
  it("허용 목록에 있는 값만 통과한다", () => {
    expect(isReportStatusCode("submitted")).toBe(true);
    expect(isReportStatusCode("아무거나")).toBe(false);
    expect(isReportStatusCode(undefined)).toBe(false);
  });
});

describe("restaurantReportCategorySchema", () => {
  it("허용된 6가지 유형만 통과한다", () => {
    expect(restaurantReportCategorySchema.safeParse("stale_info").success).toBe(true);
    expect(restaurantReportCategorySchema.safeParse("price_changed").success).toBe(true);
    expect(restaurantReportCategorySchema.safeParse("menu_gone").success).toBe(true);
    expect(restaurantReportCategorySchema.safeParse("hours_changed").success).toBe(true);
    expect(restaurantReportCategorySchema.safeParse("closed_down").success).toBe(true);
    expect(restaurantReportCategorySchema.safeParse("duplicate_restaurant").success).toBe(true);
  });

  it("허용되지 않은 값은 거부한다", () => {
    expect(restaurantReportCategorySchema.safeParse("아무거나").success).toBe(false);
    expect(restaurantReportCategorySchema.safeParse("").success).toBe(false);
  });
});

describe("getRestaurantReportCategoryLabel", () => {
  it("등록된 유형은 한글 라벨을 반환한다", () => {
    expect(getRestaurantReportCategoryLabel("price_changed")).toBe("가격이 달라요");
    expect(getRestaurantReportCategoryLabel("closed_down")).toBe("폐업했어요");
  });

  it("등록되지 않은 값은 그대로 반환한다", () => {
    expect(getRestaurantReportCategoryLabel("unknown")).toBe("unknown");
  });
});

describe("restaurantReportNoteSchema", () => {
  it("빈 값도 통과한다(선택 항목)", () => {
    expect(restaurantReportNoteSchema.safeParse("").success).toBe(true);
  });

  it("200자를 넘으면 거부한다", () => {
    expect(restaurantReportNoteSchema.safeParse("a".repeat(201)).success).toBe(false);
  });
});

describe("isRestaurantReportStatusCode", () => {
  it("허용 목록에 있는 값만 통과한다", () => {
    expect(isRestaurantReportStatusCode("submitted")).toBe(true);
    expect(isRestaurantReportStatusCode("아무거나")).toBe(false);
    expect(isRestaurantReportStatusCode(undefined)).toBe(false);
  });
});
