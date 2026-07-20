import { describe, expect, it } from "vitest";
import { isReviewStatusCode, parseTagList, reviewSchema } from "./validation";

const validBase = {
  tasteRating: "5",
  speedRating: "4",
  priceRating: "3",
  soloFitRating: "5",
  revisitIntent: "again",
};

describe("reviewSchema", () => {
  it("필수 4종 + 재방문 의향만 있어도 통과한다", () => {
    const result = reviewSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tasteRating).toBe(5);
      expect(result.data.revisitIntent).toBe("again");
    }
  });

  it("필수 항목이 1~5 범위를 벗어나면 거부한다", () => {
    expect(reviewSchema.safeParse({ ...validBase, tasteRating: "0" }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...validBase, tasteRating: "6" }).success).toBe(false);
  });

  it("재방문 의향이 허용 목록 밖이면 거부한다", () => {
    expect(reviewSchema.safeParse({ ...validBase, revisitIntent: "yes" }).success).toBe(false);
  });

  it("선택 항목(양/혼잡/단체적합성/청결)은 없어도 통과한다", () => {
    const result = reviewSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.portionRating).toBeUndefined();
    }
  });

  it("선택 항목도 범위를 벗어나면 거부한다", () => {
    expect(reviewSchema.safeParse({ ...validBase, portionRating: "6" }).success).toBe(false);
  });

  it("한 줄 후기가 200자를 넘으면 거부한다", () => {
    expect(reviewSchema.safeParse({ ...validBase, oneLineReview: "a".repeat(201) }).success).toBe(false);
  });

  it("한 줄 후기가 200자 이하면 통과한다", () => {
    expect(reviewSchema.safeParse({ ...validBase, oneLineReview: "맛있어요" }).success).toBe(true);
  });

  it("고정 목록에 있는 태그 배열은 통과한다", () => {
    const result = reviewSchema.safeParse({ ...validBase, tags: ["빨리 나와요", "가성비 좋아요"] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual(["빨리 나와요", "가성비 좋아요"]);
    }
  });

  it("고정 목록에 없는 태그는 거부한다", () => {
    expect(reviewSchema.safeParse({ ...validBase, tags: ["아무거나"] }).success).toBe(false);
  });
});

describe("parseTagList", () => {
  it("고정 목록에 있는 값만 통과시킨다", () => {
    expect(parseTagList(["빨리 나와요", "아무거나", "가성비 좋아요"])).toEqual(["빨리 나와요", "가성비 좋아요"]);
  });

  it("중복은 제거한다", () => {
    expect(parseTagList(["빨리 나와요", "빨리 나와요"])).toEqual(["빨리 나와요"]);
  });

  it("빈 배열은 빈 배열이다", () => {
    expect(parseTagList([])).toEqual([]);
  });
});

describe("isReviewStatusCode", () => {
  it("허용 목록에 있는 값만 통과한다", () => {
    expect(isReviewStatusCode("saved")).toBe(true);
    expect(isReviewStatusCode("아무거나")).toBe(false);
    expect(isReviewStatusCode(undefined)).toBe(false);
  });
});
