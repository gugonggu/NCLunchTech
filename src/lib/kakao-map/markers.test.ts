import { describe, expect, it } from "vitest";
import { buildBoundsPoints, computeBounds } from "./markers";

describe("computeBounds", () => {
  it("좌표가 없으면 null", () => {
    expect(computeBounds([])).toBeNull();
  });

  it("점이 하나면 sw와 ne가 같다", () => {
    const result = computeBounds([{ id: "a", lat: 35.17, lng: 129.13 }]);
    expect(result).toEqual({ swLat: 35.17, swLng: 129.13, neLat: 35.17, neLng: 129.13 });
  });

  it("여러 점을 모두 포함하는 최소 범위를 계산한다", () => {
    const result = computeBounds([
      { id: "a", lat: 35.1, lng: 129.1 },
      { id: "b", lat: 35.2, lng: 129.05 },
      { id: "c", lat: 35.15, lng: 129.2 },
    ]);
    expect(result).toEqual({ swLat: 35.1, swLng: 129.05, neLat: 35.2, neLng: 129.2 });
  });
});

describe("buildBoundsPoints", () => {
  it("회사 위치가 있으면 목록에 포함한다", () => {
    const restaurants = [{ id: "a", lat: 35.1, lng: 129.1 }];
    const company = { id: "company", lat: 35.17, lng: 129.13 };
    expect(buildBoundsPoints(restaurants, company)).toEqual([...restaurants, company]);
  });

  it("회사 위치가 없으면 식당 목록만 반환한다", () => {
    const restaurants = [{ id: "a", lat: 35.1, lng: 129.1 }];
    expect(buildBoundsPoints(restaurants, null)).toEqual(restaurants);
  });
});
