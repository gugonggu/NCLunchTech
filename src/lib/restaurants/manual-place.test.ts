import { describe, expect, it } from "vitest";
import { kakaoPlaceIdFromUrl } from "./manual-place";

describe("kakaoPlaceIdFromUrl", () => {
  it("extracts a Kakao place id from a place URL", () => {
    expect(kakaoPlaceIdFromUrl("https://place.map.kakao.com/1404535120")).toBe("1404535120");
  });

  it("rejects a non-Kakao URL", () => {
    expect(kakaoPlaceIdFromUrl("https://example.com/1404535120")).toBeNull();
  });
});
