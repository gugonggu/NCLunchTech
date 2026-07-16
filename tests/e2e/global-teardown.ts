import { E2E_REGISTRY_PATH } from "../support/registry-paths";
import { cleanupLeftoverRegistry } from "../support/registry-lifecycle";

export default async function globalTeardown() {
  await cleanupLeftoverRegistry(E2E_REGISTRY_PATH, "e2e");
}
