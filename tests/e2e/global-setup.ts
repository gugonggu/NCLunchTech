import { assertTestSupabaseIsolated, loadTestEnv } from "../support/env-guard";
import { E2E_REGISTRY_PATH } from "../support/registry-paths";
import { cleanupLeftoverRegistry } from "../support/registry-lifecycle";

export default async function globalSetup() {
  loadTestEnv();
  const { testRef } = assertTestSupabaseIsolated();
  console.log(`[e2e] 테스트 Supabase project ref: ${testRef}`);
  await cleanupLeftoverRegistry(E2E_REGISTRY_PATH, "e2e");
}
