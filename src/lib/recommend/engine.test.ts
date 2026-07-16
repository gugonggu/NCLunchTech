import { describe, expect, it } from "vitest";
import {
  buildRecommendReason,
  filterByRadius,
  filterCandidates,
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
    // random이 항상 같은 값을 반환하면 셔플 결과도 항상 같다(피셔-예이츠, random=0 고정).
    const result = pickRecommendation(list, { random: () => 0 });
    expect(result.main?.id).toBe("b");
    expect(result.alternatives.map((c) => c.id)).toEqual(["c", "d"]);
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

describe("buildRecommendReason", () => {
  it("실제로 확인 불가능한 정보(리뷰 수·혼잡도 등)를 언급하지 않는다", () => {
    const main = candidate({ id: "a" });
    const reason = buildRecommendReason(main, {});
    expect(reason).not.toMatch(/리뷰|인기|혼잡|영업 중/);
  });
});
