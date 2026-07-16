import { defineConfig, devices } from "@playwright/test";
import { assertTestSupabaseIsolated, loadTestEnv } from "./tests/support/env-guard";

// webServer는 globalSetup보다 먼저 기동되므로, 격리 가드는 설정 파일 로드 시점에
// 동기적으로 먼저 실행해 잘못된 환경으로 빌드가 시도되는 일 자체를 막는다.
loadTestEnv();
assertTestSupabaseIsolated();

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3100",
  },
  webServer: {
    command: "npm run build && npm run start:e2e",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
