import { describe, expect, it } from "vitest";
import {
  MAX_WEIGHT,
  MIN_WEIGHT,
  buildRecommendReasons,
  filterByRadius,
  filterCandidates,
  getWeight,
  pickRecommendation,
  type RecommendCandidate,
} from "./engine";

function candidate(overrides: Partial<RecommendCandidate>): RecommendCandidate {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    name: "테스트식당",
    category: "한식",
    distanceM: 100,
    isActive: true,
    menuItems: [],
    lat: 35.17,
    lng: 129.13,
    ...overrides,
  };
}

describe("filterByRadius", () => {
  it("반경 이내(경계값 포함)만 남긴다", () => {
    const list = [candidate({ id: "a", distanceM: 800 }), candidate({ id: "b", distanceM: 801 })];
    const result = filterByRadius(list, 800);
    expect(result.map((c) => c.id)).toEqual(["a"]);
  });
});

describe("filterCandidates", () => {
  it("비활성 식당은 항상 제외한다", () => {
    const list = [candidate({ id: "a", isActive: false })];
    expect(filterCandidates(list, {})).toEqual([]);
  });

  it("식당명 조건에 맞는 것만 남긴다", () => {
    const list = [candidate({ id: "a", name: "부산냉면" }), candidate({ id: "b", name: "경남돈까스" })];
    const result = filterCandidates(list, { restaurantName: "냉면" });
    expect(result.map((c) => c.id)).toEqual(["a"]);
  });

  it("메뉴명 조건은 등록된 메뉴 이름에서 찾는다", () => {
    const list = [
      candidate({ id: "a", menuItems: [{ name: "김치찌개", price: 8000 }] }),
      candidate({ id: "b", menuItems: [{ name: "돈까스", price: 9000 }] }),
    ];
    const result = filterCandidates(list, { menuName: "김치" });
    expect(result.map((c) => c.id)).toEqual(["a"]);
  });

  it("메뉴 데이터가 없는 식당은 메뉴명 조건에서 자연히 제외된다", () => {
    const list = [candidate({ id: "a", menuItems: [] })];
    expect(filterCandidates(list, { menuName: "아무거나" })).toEqual([]);
  });

  it("카테고리 조건에 맞는 것만 남긴다", () => {
    const list = [candidate({ id: "a", category: "한식" }), candidate({ id: "b", category: "일식" })];
    const result = filterCandidates(list, { category: "일식" });
    expect(result.map((c) => c.id)).toEqual(["b"]);
  });

  it("가격 조건은 등록된 메뉴 중 하나라도 기준 이하면 통과한다", () => {
    const list = [
      candidate({
        id: "a",
        menuItems: [
          { name: "A", price: 12000 },
          { name: "B", price: 7000 },
        ],
      }),
      candidate({ id: "b", menuItems: [{ name: "C", price: 15000 }] }),
    ];
    const result = filterCandidates(list, { maxPriceWon: 8000 });
    expect(result.map((c) => c.id)).toEqual(["a"]);
  });

  it("가격이 null인 메뉴는 가격 조건 비교에서 무시한다", () => {
    const list = [candidate({ id: "a", menuItems: [{ name: "가격미정", price: null }] })];
    expect(filterCandidates(list, { maxPriceWon: 5000 })).toEqual([]);
  });

  it("excludeRecentVisits 체크 시 14일 이내 완료 방문 식당을 완전히 제외한다", () => {
    const list = [candidate({ id: "a" }), candidate({ id: "b" })];
    const recentVisitDays = new Map([["a", 3]]);
    const result = filterCandidates(list, { excludeRecentVisits: true }, recentVisitDays);
    expect(result.map((c) => c.id)).toEqual(["b"]);
  });

  it("excludeRecentVisits 체크가 없으면 최근 방문 식당도 후보에 남는다(감점만, 제외는 아님)", () => {
    const list = [candidate({ id: "a" }), candidate({ id: "b" })];
    const recentVisitDays = new Map([["a", 3]]);
    const result = filterCandidates(list, {}, recentVisitDays);
    expect(result.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("excludeRecentVisits로 후보가 모두 제외되면 빈 배열을 반환한다(임의로 조건을 무시하지 않음)", () => {
    const list = [candidate({ id: "a" })];
    const recentVisitDays = new Map([["a", 0]]);
    expect(filterCandidates(list, { excludeRecentVisits: true }, recentVisitDays)).toEqual([]);
  });

  it("신선한 영업 상태가 완전 제외 대상이면 조건과 무관하게 항상 제외한다", () => {
    const list = [
      candidate({ id: "a", excludingBusinessStatus: "재료 소진" }),
      candidate({ id: "b", excludingBusinessStatus: null }),
    ];
    expect(filterCandidates(list, {}).map((c) => c.id)).toEqual(["b"]);
  });

  it("혼잡한 곳 제외를 선택하지 않으면 혼잡한 식당도 후보에 남는다", () => {
    const list = [candidate({ id: "a", isFreshlyCongested: true }), candidate({ id: "b" })];
    expect(filterCandidates(list, {}).map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("혼잡한 곳 제외를 선택하면 신선하게 혼잡한 식당만 제외한다", () => {
    const list = [candidate({ id: "a", isFreshlyCongested: true }), candidate({ id: "b" })];
    expect(filterCandidates(list, { excludeCongested: true }).map((c) => c.id)).toEqual(["b"]);
  });
});

describe("pickRecommendation", () => {
  it("후보가 없으면 main이 null이다", () => {
    const result = pickRecommendation([]);
    expect(result.main).toBeNull();
    expect(result.alternatives).toEqual([]);
    expect(result.wasExclusionReset).toBe(false);
  });

  it("후보가 하나면 main만 채워지고 대안은 비어있다", () => {
    const list = [candidate({ id: "a" })];
    const result = pickRecommendation(list);
    expect(result.main?.id).toBe("a");
    expect(result.alternatives).toEqual([]);
  });

  it("random을 주입하면 결정적으로 메인/대안이 정해진다", () => {
    const list = [
      candidate({ id: "a" }),
      candidate({ id: "b" }),
      candidate({ id: "c" }),
      candidate({ id: "d" }),
    ];
    // random이 항상 0을 반환하면 가중 추출도 항상 같은 순서를 고른다(가중치가 모두 같을 때는 원래 순서).
    const result = pickRecommendation(list, { random: () => 0 });
    expect(result.main?.id).toBe("a");
    expect(result.alternatives.map((c) => c.id)).toEqual(["b", "c"]);
  });

  it("방문 기록이 없으면(recentVisitDays 없음) 가중치 없이 기존과 동일하게 동작한다", () => {
    const list = [candidate({ id: "a" }), candidate({ id: "b" }), candidate({ id: "c" }), candidate({ id: "d" })];
    const withRecency = pickRecommendation(list, { random: () => 0, recentVisitDays: new Map() });
    const withoutRecency = pickRecommendation(list, { random: () => 0 });
    expect(withRecency).toEqual(withoutRecency);
  });

  it("최근 방문 식당은 가중치가 낮아 같은 random 값에서도 메인으로 덜 뽑힌다", () => {
    const list = [candidate({ id: "x" }), candidate({ id: "y" })];
    const random = () => 0.7;

    const withoutRecency = pickRecommendation(list, { random });
    expect(withoutRecency.main?.id).toBe("y");

    const recentVisitDays = new Map([["y", 2]]); // y를 2일 전에 방문(14일 이내)
    const withRecency = pickRecommendation(list, { random, recentVisitDays });
    expect(withRecency.main?.id).toBe("x");
  });

  it("14일을 초과한 방문은 감점하지 않는다(경계값 포함)", () => {
    const list = [candidate({ id: "x" }), candidate({ id: "y" })];
    const random = () => 0.7;
    // 정확히 14일 전은 "14일 이내"가 아니므로 감점 대상이 아니다.
    const recentVisitDays = new Map([["y", 14]]);
    const result = pickRecommendation(list, { random, recentVisitDays });
    expect(result.main?.id).toBe("y");
  });

  it("모든 후보가 최근 방문이어도 결과를 반환한다(가중치가 0이 되지 않음)", () => {
    const list = [candidate({ id: "a" }), candidate({ id: "b" }), candidate({ id: "c" })];
    const recentVisitDays = new Map([
      ["a", 1],
      ["b", 1],
      ["c", 1],
    ]);
    const result = pickRecommendation(list, { random: () => 0.5, recentVisitDays });
    expect(result.main).not.toBeNull();
  });

  it("제외 목록에 있는 식당은 메인/대안에서 빠진다", () => {
    const list = [candidate({ id: "a" }), candidate({ id: "b" }), candidate({ id: "c" })];
    const result = pickRecommendation(list, { excludeIds: ["a"], random: () => 0 });
    expect(result.main?.id).not.toBe("a");
    expect(result.alternatives.map((c) => c.id)).not.toContain("a");
    expect(result.wasExclusionReset).toBe(false);
  });

  it("제외 목록을 적용하면 후보가 하나도 안 남을 때는 제외를 무시하고 전체에서 다시 뽑는다", () => {
    const list = [candidate({ id: "a" }), candidate({ id: "b" })];
    const result = pickRecommendation(list, { excludeIds: ["a", "b"], random: () => 0 });
    expect(result.main).not.toBeNull();
    expect(result.wasExclusionReset).toBe(true);
  });

  it("입력에 같은 id가 중복돼도 메인과 대안 사이에 중복이 없다", () => {
    const list = [
      candidate({ id: "a" }),
      candidate({ id: "a" }),
      candidate({ id: "b" }),
      candidate({ id: "c" }),
    ];
    const result = pickRecommendation(list, { random: () => 0 });
    const ids = [result.main?.id, ...result.alternatives.map((c) => c.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getWeight", () => {
  it("아무 조건도 없으면 1이다", () => {
    expect(getWeight(candidate({ id: "a" }))).toBe(1);
  });

  it("신선하게 혼잡한 식당은 감점된다", () => {
    expect(getWeight(candidate({ id: "a", isFreshlyCongested: true }))).toBeLessThan(1);
  });

  it("우선 조건을 선택하지 않으면 해당 신호가 있어도 가점되지 않는다", () => {
    expect(getWeight(candidate({ id: "a", isFavorite: true }), {})).toBe(1);
  });

  it("preferFavorites를 선택하고 즐겨찾기한 식당이면 가점된다", () => {
    expect(getWeight(candidate({ id: "a", isFavorite: true }), { preferFavorites: true })).toBeGreaterThan(1);
  });

  it("여러 우선 조건이 동시에 만족되면 곱해서 더 크게 가점된다", () => {
    const single = getWeight(candidate({ id: "a", isFavorite: true }), { preferFavorites: true });
    const double = getWeight(candidate({ id: "a", isFavorite: true, isUnvisitedByMe: true }), {
      preferFavorites: true,
      preferUnvisited: true,
    });
    expect(double).toBeGreaterThan(single);
  });

  it("가중치가 아무리 겹쳐도 MIN_WEIGHT~MAX_WEIGHT 범위를 벗어나지 않는다", () => {
    const veryLow = getWeight(
      { ...candidate({ id: "a" }), isFreshlyCongested: true },
      {},
      new Map([["a", 0]])
    );
    expect(veryLow).toBeGreaterThanOrEqual(MIN_WEIGHT);

    const veryHigh = getWeight(
      candidate({ id: "a", isFavorite: true, hasGoodRatingSignal: true, hasFastServiceSignal: true, isUnvisitedByMe: true }),
      { preferFavorites: true, preferGoodRating: true, preferFast: true, preferUnvisited: true }
    );
    expect(veryHigh).toBeLessThanOrEqual(MAX_WEIGHT);
  });
});

describe("buildRecommendReasons", () => {
  it("실제로 확인 불가능한 정보(가짜 인기·혼잡 등)를 언급하지 않는다", () => {
    const main = candidate({ id: "a" });
    const reasons = buildRecommendReasons(main, {});
    expect(reasons.join(" ")).not.toMatch(/인기|영업 중/);
  });

  it("아무 신호도 없으면 거리 문구를 최소 1개 보장한다", () => {
    // recentVisitDays에 이 식당이 최근 방문으로 잡혀 있어야 "최근 미방문" 사유도 안 뜬다.
    const main = candidate({ id: "a", distanceM: 250 });
    const recentVisitDays = new Map([["a", 3]]);
    expect(buildRecommendReasons(main, {}, recentVisitDays)).toEqual(["회사에서 약 250m 거리예요."]);
  });

  it("검색/카테고리 조건이 최우선으로 들어간다", () => {
    const main = candidate({ id: "a" });
    const reasons = buildRecommendReasons(main, { category: "한식" });
    expect(reasons[0]).toBe("선택하신 '한식' 분류에서 골라봤어요.");
  });

  it("즐겨찾기·리뷰 태그 등 실제 신호가 있으면 함께 표시하되 최대 2개로 자른다", () => {
    const main = candidate({ id: "a", isFavorite: true, hasGoodRatingSignal: true, topReviewTag: "가성비 좋아요" });
    const reasons = buildRecommendReasons(main, {});
    expect(reasons).toHaveLength(2);
    expect(reasons[0]).toBe("즐겨찾기한 식당이에요.");
  });

  it("최근 방문 기록이 없으면(recentVisitDays에 없음) 최근 미방문 사유를 넣는다", () => {
    const main = candidate({ id: "a" });
    const reasons = buildRecommendReasons(main, {}, new Map());
    expect(reasons).toContain("최근 14일 동안 방문하지 않았어요.");
  });

  it("14일 이내 방문 기록이 있으면 최근 미방문 사유를 넣지 않는다", () => {
    const main = candidate({ id: "a", distanceM: 250 });
    const reasons = buildRecommendReasons(main, {}, new Map([["a", 3]]));
    expect(reasons).not.toContain("최근 14일 동안 방문하지 않았어요.");
  });
});
