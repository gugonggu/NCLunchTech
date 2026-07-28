import { describe, expect, it } from "vitest";
import { hasMenuPriceChanged, hasRestaurantHoursChanged } from "./info-change";

describe("hasMenuPriceChanged", () => {
  it("가격이 바뀌면 true다", () => {
    expect(hasMenuPriceChanged({ price: 8000 }, { price: 9000 })).toBe(true);
  });

  it("가격이 같으면(동일 값 재저장) false다", () => {
    expect(hasMenuPriceChanged({ price: 8000 }, { price: 8000 })).toBe(false);
  });

  it("null에서 값이 생기면 true다", () => {
    expect(hasMenuPriceChanged({ price: null }, { price: 8000 })).toBe(true);
  });
});

describe("hasRestaurantHoursChanged", () => {
  it("이전 데이터가 없으면(최초 등록) true다", () => {
    expect(hasRestaurantHoursChanged(null, [{ day_of_week: 0, is_closed: true }])).toBe(true);
  });

  it("내용이 완전히 같으면 false다", () => {
    const rows = [{ day_of_week: 0, is_closed: true, open_time: null, close_time: null }];
    expect(hasRestaurantHoursChanged(rows, rows)).toBe(false);
  });

  it("한 요일이라도 다르면 true다", () => {
    const before = [{ day_of_week: 0, is_closed: true, open_time: null, close_time: null }];
    const after = [{ day_of_week: 0, is_closed: false, open_time: "09:00", close_time: "20:00" }];
    expect(hasRestaurantHoursChanged(before, after)).toBe(true);
  });
});
