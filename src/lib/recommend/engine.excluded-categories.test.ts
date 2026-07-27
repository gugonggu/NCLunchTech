import { describe, expect, it } from "vitest";
import { RESTAURANT_CATEGORIES } from "@/lib/restaurants/constants";
import { filterCandidates, type RecommendCandidate } from "./engine";

function candidate(id: string, category: string): RecommendCandidate {
  return {
    id,
    name: id,
    category,
    distanceM: 100,
    isActive: true,
    menuItems: [],
    lat: 35.17,
    lng: 129.13,
  };
}

describe("filterCandidates excluded categories", () => {
  it("removes candidates from every excluded category", () => {
    const list = [
      candidate("a", RESTAURANT_CATEGORIES[0]),
      candidate("b", RESTAURANT_CATEGORIES[1]),
      candidate("c", RESTAURANT_CATEGORIES[2]),
    ];

    expect(
      filterCandidates(list, { excludedCategories: [RESTAURANT_CATEGORIES[0], RESTAURANT_CATEGORIES[2]] }).map((item) => item.id),
    ).toEqual(["b"]);
  });
});
