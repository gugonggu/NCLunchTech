import { describe, expect, it } from "vitest";
import { distanceInMeters } from "./geo";

describe("distanceInMeters", () => {
  it("같은 지점은 거리가 0이다", () => {
    expect(distanceInMeters({ lat: 35.17, lng: 129.13 }, { lat: 35.17, lng: 129.13 })).toBe(0);
  });

  it("위도 1도 차이는 약 111.2km다", () => {
    const distance = distanceInMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(distance).toBeGreaterThan(110000);
    expect(distance).toBeLessThan(112000);
  });

  it("가까운 좌표는 반경(m) 판정에 쓸 수 있을 만큼 정확하다", () => {
    const center = { lat: 35.1720591571479, lng: 129.128432630796 };
    const nearby = { lat: 35.1725, lng: 129.129 };
    const distance = distanceInMeters(center, nearby);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(1000);
  });
});
