import { expect, test } from "@playwright/test";
import {
  createTestRestaurant,
  deleteEmployeeById,
  deleteRestaurantById,
  findEmployeeIdByNickname,
  generateTestNickname,
  getInviteCode,
} from "../support/db-helpers";
import { recordEntity } from "../support/registry";
import { E2E_REGISTRY_PATH } from "../support/registry-paths";

test("비활성 식당은 직원 목록에서 보이지 않고 상세는 404다", async ({ page }) => {
  const nickname = generateTestNickname();
  const pin = "1234";
  let employeeId: string | null = null;
  let activeId: string | null = null;
  let inactiveId: string | null = null;

  try {
    activeId = await createTestRestaurant(E2E_REGISTRY_PATH, { name: "E2E활성식당", isActive: true });
    inactiveId = await createTestRestaurant(E2E_REGISTRY_PATH, { name: "E2E비활성식당", isActive: false });

    const inviteCode = await getInviteCode();
    await page.goto("/signup");
    await page.getByPlaceholder("초대코드").fill(inviteCode);
    await page.getByPlaceholder("닉네임").fill(nickname);
    await page.getByPlaceholder("PIN 4자리").fill(pin);
    await page.getByPlaceholder("PIN 확인").fill(pin);
    await page.getByRole("button", { name: "가입하기" }).click();
    await expect(page).toHaveURL("/");

    employeeId = await findEmployeeIdByNickname(nickname);
    if (employeeId) {
      recordEntity(E2E_REGISTRY_PATH, "employees", employeeId);
    }

    await test.step("활성 식당은 목록에 보이고 비활성 식당은 보이지 않는다", async () => {
      await page.goto("/restaurants?radius=2000&q=E2E");
      await expect(page.getByText("E2E활성식당")).toBeVisible();
      await expect(page.getByText("E2E비활성식당")).not.toBeVisible();
    });

    await test.step("비활성 식당 상세 페이지는 404다", async () => {
      const res = await page.goto(`/restaurants/${inactiveId}`);
      expect(res?.status()).toBe(404);
    });
  } finally {
    if (employeeId) {
      await deleteEmployeeById(E2E_REGISTRY_PATH, employeeId);
    }
    if (activeId) {
      await deleteRestaurantById(E2E_REGISTRY_PATH, activeId);
    }
    if (inactiveId) {
      await deleteRestaurantById(E2E_REGISTRY_PATH, inactiveId);
    }
  }
});
