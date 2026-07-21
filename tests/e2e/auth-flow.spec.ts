import { expect, test } from "@playwright/test";
import { deleteEmployeeById, findEmployeeIdByNickname, generateTestNickname, getInviteCode } from "../support/db-helpers";
import { recordEntity } from "../support/registry";
import { E2E_REGISTRY_PATH } from "../support/registry-paths";

test("직원 인증 흐름: 비로그인 → 가입 → 식당찾기 접근 → 로그아웃 → 재로그인", async ({ page }) => {
  const nickname = generateTestNickname();
  const pin = "1234";
  let employeeId: string | null = null;

  try {
    await page.setViewportSize({ width: 390, height: 844 });

    await test.step("비로그인 사용자는 홈에서 로그인·회원가입 링크를 볼 수 있다", async () => {
      await page.goto("/");
      await expect(page.getByRole("link", { name: "로그인" })).toBeVisible();
      await expect(page.getByRole("link", { name: "회원가입" })).toBeVisible();
    });

    await test.step("회원가입 성공 후 홈에 닉네임과 식당 찾기 링크가 표시된다", async () => {
      const inviteCode = await getInviteCode();

      await page.goto("/signup");
      await page.getByPlaceholder("초대코드").fill(inviteCode);
      await page.getByPlaceholder("닉네임").fill(nickname);
      await page.getByPlaceholder("PIN 4자리").fill(pin);
      await page.getByPlaceholder("PIN 확인").fill(pin);
      await page.getByRole("button", { name: "가입하기" }).click();

      await expect(page).toHaveURL("/");
      await expect(page.getByText(`${nickname}님, 안녕하세요.`)).toBeVisible();
      await expect(page.getByRole("link", { name: "식당 찾기" })).toBeVisible();
      const mobileNavigation = page.getByRole("navigation", { name: "하단 탐색" });
      for (const label of ["홈", "식당", "함께 먹기", "알림", "내 정보"]) {
        await expect(mobileNavigation.getByRole("link", { name: label })).toBeVisible();
      }

      employeeId = await findEmployeeIdByNickname(nickname);
      expect(employeeId).not.toBeNull();
      if (employeeId) {
        recordEntity(E2E_REGISTRY_PATH, "employees", employeeId);
      }
    });

    await test.step("/restaurants에 접근할 수 있다", async () => {
      await page.goto("/restaurants");
      await expect(page.getByRole("heading", { name: "식당 찾기" })).toBeVisible();
    });

    await test.step("로그아웃하면 홈이 비로그인 화면으로 바뀐다", async () => {
      await page.goto("/me");
      await page.getByRole("button", { name: "로그아웃" }).click();
      await expect(page.getByRole("link", { name: "로그인" })).toBeVisible();
    });

    await test.step("로그아웃 후 /restaurants 접근 시 /login으로 이동한다", async () => {
      await page.goto("/restaurants");
      await expect(page).toHaveURL(/\/login$/);
    });

    await test.step("직원 로그인 성공", async () => {
      await page.getByPlaceholder("닉네임").fill(nickname);
      await page.getByPlaceholder("PIN 4자리").fill(pin);
      await page.getByRole("button", { name: "로그인" }).click();

      await expect(page).toHaveURL("/");
      await expect(page.getByText(`${nickname}님, 안녕하세요.`)).toBeVisible();
    });
  } finally {
    if (employeeId) {
      await deleteEmployeeById(E2E_REGISTRY_PATH, employeeId);
    }
  }
});
