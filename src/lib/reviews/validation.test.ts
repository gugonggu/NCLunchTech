import { describe, expect, it } from "vitest";
import {
  aggregateReviewRows,
  hasFastServiceSignal,
  hasGoodRatingSignal,
  isReviewStatusCode,
  parseTagList,
  reviewSchema,
  type ReviewAggregateRow,
} from "./validation";

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

function row(overrides: Partial<ReviewAggregateRow>): ReviewAggregateRow {
  return {
    restaurantId: "r1",
    tasteRating: 5,
    speedRating: 5,
    priceRating: 5,
    soloFitRating: 5,
    tags: null,
    ...overrides,
  };
}

describe("aggregateReviewRows", () => {
  it("식당별로 평균 평점을 계산한다", () => {
    const result = aggregateReviewRows([
      row({ restaurantId: "a", tasteRating: 4, speedRating: 4, priceRating: 4, soloFitRating: 4 }),
      row({ restaurantId: "a", tasteRating: 2, speedRating: 2, priceRating: 2, soloFitRating: 2 }),
      row({ restaurantId: "b", tasteRating: 5, speedRating: 5, priceRating: 5, soloFitRating: 5 }),
    ]);

    expect(result.get("a")?.avgOverall).toBe(3);
    expect(result.get("a")?.reviewCount).toBe(2);
    expect(result.get("b")?.avgOverall).toBe(5);
  });

  it("속도 평점만 따로 평균낸다", () => {
    const result = aggregateReviewRows([
      row({ restaurantId: "a", speedRating: 3 }),
      row({ restaurantId: "a", speedRating: 5 }),
    ]);
    expect(result.get("a")?.avgSpeed).toBe(4);
  });

  it("태그가 2건 이상 언급되면 최다 언급 태그를 반환한다", () => {
    const result = aggregateReviewRows([
      row({ restaurantId: "a", tags: ["가성비 좋아요"] }),
      row({ restaurantId: "a", tags: ["가성비 좋아요", "양이 많아요"] }),
      row({ restaurantId: "a", tags: ["양이 많아요"] }),
    ]);
    // 가성비 좋아요: 2건, 양이 많아요: 2건 → 먼저 등장한(더 많이 센 순서상 동일할 때 첫 값 유지) 태그
    expect(result.get("a")?.topTag).not.toBeNull();
  });

  it("모든 태그가 1건씩만 언급되면 topTag는 null이다", () => {
    const result = aggregateReviewRows([
      row({ restaurantId: "a", tags: ["가성비 좋아요"] }),
      row({ restaurantId: "a", tags: ["양이 많아요"] }),
    ]);
    expect(result.get("a")?.topTag).toBeNull();
  });

  it("리뷰가 없으면 빈 Map이다", () => {
    expect(aggregateReviewRows([]).size).toBe(0);
  });
});

describe("hasGoodRatingSignal / hasFastServiceSignal", () => {
  it("리뷰 2건 이상 + 평균 4.0 이상이면 true", () => {
    const result = aggregateReviewRows([row({ restaurantId: "a" }), row({ restaurantId: "a" })]);
    expect(hasGoodRatingSignal(result.get("a"))).toBe(true);
    expect(hasFastServiceSignal(result.get("a"))).toBe(true);
  });

  it("리뷰가 1건뿐이면 평점이 높아도 false(표본 부족)", () => {
    const result = aggregateReviewRows([row({ restaurantId: "a" })]);
    expect(hasGoodRatingSignal(result.get("a"))).toBe(false);
  });

  it("평균이 기준 미만이면 false", () => {
    const result = aggregateReviewRows([
      row({ restaurantId: "a", tasteRating: 2, speedRating: 2, priceRating: 2, soloFitRating: 2 }),
      row({ restaurantId: "a", tasteRating: 2, speedRating: 2, priceRating: 2, soloFitRating: 2 }),
    ]);
    expect(hasGoodRatingSignal(result.get("a"))).toBe(false);
  });

  it("집계 자체가 없으면(undefined) false", () => {
    expect(hasGoodRatingSignal(undefined)).toBe(false);
    expect(hasFastServiceSignal(undefined)).toBe(false);
  });
});
