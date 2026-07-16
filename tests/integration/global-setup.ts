import { assertTestSupabaseIsolated, loadTestEnv } from "../support/env-guard";
import { INTEGRATION_REGISTRY_PATH } from "../support/registry-paths";
import { cleanupLeftoverRegistry } from "../support/registry-lifecycle";

// Vitest는 globalSetup 파일의 기본 export가 반환하는 함수를 teardown으로 사용한다
// (Playwright처럼 별도 globalTeardown 설정 필드가 없다).
export default async function setup() {
  loadTestEnv();
  const { testRef } = assertTestSupabaseIsolated();
  console.log(`[integration] 테스트 Supabase project ref: ${testRef}`);
  await cleanupLeftoverRegistry(INTEGRATION_REGISTRY_PATH, "integration");

  return async function teardown() {
    await cleanupLeftoverRegistry(INTEGRATION_REGISTRY_PATH, "integration");
  };
}
