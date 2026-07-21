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

// 잘못된 HH:mm "형식"은 <input type="time">이 브라우저 차원에서 막기 때문에
// 여기서는 재현하지 않는다(hours-validation.test.ts에서 유닛 테스트로 검증).
// 여기서는 형식은 유효하지만 값이 잘못된 경우(종료<시작)와 정상/휴무 케이스만 다룬다.
test("영업시간 저장: 정상 저장, 종료<시작 거부, 휴무일 처리", async ({ page }) => {
  const nickname = generateTestNickname();
  const pin = "1234";
  let employeeId: string | null = null;
  let restaurantId: string | null = null;

  try {
    restaurantId = await createTestRestaurant(E2E_REGISTRY_PATH);

    const inviteCode = await getInviteCode();
    await page.goto("/signup");
    await page.getByLabel("초대코드").fill(inviteCode);
    await page.getByLabel("닉네임").fill(nickname);
    await page.getByLabel("PIN 4자리").fill(pin);
    await page.getByLabel("PIN 확인").fill(pin);
    await page.getByRole("button", { name: "가입하기" }).click();
    await expect(page).toHaveURL("/");

    employeeId = await findEmployeeIdByNickname(nickname);
    if (employeeId) {
      recordEntity(E2E_REGISTRY_PATH, "employees", employeeId);
    }

    await test.step("정상 영업시간을 저장하면 값이 유지된다", async () => {
      await page.goto(`/restaurants/${restaurantId}`);
      const opens = page.locator('input[type="time"][name^="open_"]');
      const closes = page.locator('input[type="time"][name^="close_"]');

      await opens.nth(1).fill("09:00");
      await closes.nth(1).fill("18:00");
      await page.getByRole("button", { name: "영업시간 저장" }).click();

      await expect(opens.nth(1)).toHaveValue(/09:00/);
      await expect(closes.nth(1)).toHaveValue(/18:00/);
    });

    await test.step("종료 시간이 시작 시간보다 이르면 거부되어 저장되지 않는다", async () => {
      await page.goto(`/restaurants/${restaurantId}`);
      const opens = page.locator('input[type="time"][name^="open_"]');
      const closes = page.locator('input[type="time"][name^="close_"]');

      await opens.nth(2).fill("18:00");
      await closes.nth(2).fill("09:00");
      await page.getByRole("button", { name: "영업시간 저장" }).click();

      // Server Action이 던진 예외는 프로덕션 빌드에서 구체 메시지 대신
      // Next.js 기본 에러 화면으로 나타날 수 있다. 에러 문구가 아니라
      // "실제로 잘못된 값이 저장되지 않았다"는 상태로 검증한다.
      await page.goto(`/restaurants/${restaurantId}`);
      const reopened = page.locator('input[type="time"][name^="open_"]');
      await expect(reopened.nth(2)).not.toHaveValue("18:00");
    });

    await test.step("휴무일은 시간 없이 정상 저장된다", async () => {
      await page.goto(`/restaurants/${restaurantId}`);
      const closedCheckboxes = page.locator('input[type="checkbox"][name^="closed_"]');

      await closedCheckboxes.nth(3).check();
      await page.getByRole("button", { name: "영업시간 저장" }).click();

      await expect(closedCheckboxes.nth(3)).toBeChecked();
    });
  } finally {
    if (employeeId) {
      await deleteEmployeeById(E2E_REGISTRY_PATH, employeeId);
    }
    if (restaurantId) {
      await deleteRestaurantById(E2E_REGISTRY_PATH, restaurantId);
    }
  }
});
