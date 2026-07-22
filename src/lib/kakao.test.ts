import { describe, expect, it } from "vitest";
import { filterPlacesWithinRadius, mapKakaoCategory } from "./kakao";

describe("mapKakaoCategory", () => {
  it("카페가 포함되면 카페·간단식으로 매핑한다", () => {
    expect(mapKakaoCategory("음식점 > 카페 > 커피전문점")).toBe("카페·간단식");
  });

  it("한식이 포함되면 한식으로 매핑한다", () => {
    expect(mapKakaoCategory("음식점 > 한식 > 육류,고기")).toBe("한식");
  });

  it("돈까스는 일식으로 매핑한다", () => {
    expect(mapKakaoCategory("음식점 > 일식 > 돈까스,우동")).toBe("일식");
  });

  it("매칭되는 키워드가 없으면 기타로 분류한다", () => {
    expect(mapKakaoCategory("음식점 > 뷔페")).toBe("기타");
  });

  it("키워드 검색 결과 중 2km 이내 장소만 남긴다", () => {
    expect(
      filterPlacesWithinRadius([
        { id: "near", distance: "401" },
        { id: "far", distance: "2001" },
      ] as never, 2000).map((place) => place.id),
    ).toEqual(["near"]);
  });
});
