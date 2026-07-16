import { describe, expect, it } from "vitest";
import { buildSearchGrid } from "./sync-kakao";

describe("buildSearchGrid", () => {
  it("중심점을 포함한다", () => {
    const grid = buildSearchGrid({ lat: 35.0, lng: 129.0 }, 2000, 1000);
    expect(grid).toContainEqual({ lat: 35.0, lng: 129.0 });
  });

  it("반경이 커질수록 더 많은 격자 지점을 만든다", () => {
    const small = buildSearchGrid({ lat: 35.0, lng: 129.0 }, 500, 1000);
    const large = buildSearchGrid({ lat: 35.0, lng: 129.0 }, 3000, 1000);
    expect(large.length).toBeGreaterThan(small.length);
  });

  it("반경과 간격이 같으면 3x3 격자를 만든다", () => {
    const grid = buildSearchGrid({ lat: 35.0, lng: 129.0 }, 1000, 1000);
    expect(grid.length).toBe(9);
  });
});
