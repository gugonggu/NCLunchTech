import { describe, expect, it } from "vitest";
import { mapManagedMealRecord } from "./queries";

describe("mapManagedMealRecord", () => {
  it("maps a record and its restaurant name for employee management", () => {
    expect(
      mapManagedMealRecord({
        id: "record-1",
        restaurant_id: "restaurant-1",
        menu_item_id: null,
        menu_name_snapshot: "비빔밥",
        paid_price: 9000,
        created_at: "2026-07-23T03:00:00.000Z",
        restaurants: [{ name: "점심집" }],
      }),
    ).toEqual({
      id: "record-1",
      restaurantId: "restaurant-1",
      restaurantName: "점심집",
      menuItemId: null,
      menuName: "비빔밥",
      paidPrice: 9000,
      createdAt: "2026-07-23T03:00:00.000Z",
    });
  });
});
