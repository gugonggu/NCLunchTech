import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const authSpecs = [
  "../../tests/e2e/auth-flow.spec.ts",
  "../../tests/e2e/restaurant-hours.spec.ts",
  "../../tests/e2e/restaurant-active-status.spec.ts",
] as const;

describe("employee auth E2E locator contract", () => {
  it.each(authSpecs)("uses the visible form labels in %s", (relativePath) => {
    const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");

    expect(source).not.toContain("getByPlaceholder(");
    expect(source).toContain('getByLabel("닉네임")');
    expect(source).toContain('getByLabel("PIN 4자리")');
  });
});
