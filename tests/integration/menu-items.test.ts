import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getMenuItemInRestaurant } from "@/lib/restaurants/menu-items";
import {
  createTestMenuItem,
  createTestRestaurant,
  deleteMenuItemById,
  deleteRestaurantById,
} from "../support/db-helpers";
import { INTEGRATION_REGISTRY_PATH } from "../support/registry-paths";

// 테스트 전용 Supabase 프로젝트를 실제로 사용하는 통합 테스트다(순수 유닛 테스트 아님).
describe("getMenuItemInRestaurant (통합 테스트)", () => {
  let restaurantAId: string;
  let restaurantBId: string;
  let menuItemId: string;

  beforeAll(async () => {
    restaurantAId = await createTestRestaurant(INTEGRATION_REGISTRY_PATH);
    restaurantBId = await createTestRestaurant(INTEGRATION_REGISTRY_PATH);
    menuItemId = await createTestMenuItem(INTEGRATION_REGISTRY_PATH, restaurantAId);
  });

  afterAll(async () => {
    await deleteMenuItemById(INTEGRATION_REGISTRY_PATH, menuItemId);
    await deleteRestaurantById(INTEGRATION_REGISTRY_PATH, restaurantAId);
    await deleteRestaurantById(INTEGRATION_REGISTRY_PATH, restaurantBId);
  });

  it("올바른 restaurantId와 짝지으면 메뉴를 반환한다", async () => {
    const result = await getMenuItemInRestaurant(restaurantAId, menuItemId);
    expect(result?.id).toBe(menuItemId);
  });

  it("다른 식당 id와 짝지으면 null을 반환한다(소속 불일치)", async () => {
    const result = await getMenuItemInRestaurant(restaurantBId, menuItemId);
    expect(result).toBeNull();
  });

  it("존재하지 않는 메뉴 id는 null을 반환한다", async () => {
    const result = await getMenuItemInRestaurant(restaurantAId, "00000000-0000-0000-0000-000000000000");
    expect(result).toBeNull();
  });
});
