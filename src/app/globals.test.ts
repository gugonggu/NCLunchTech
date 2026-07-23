import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("global design tokens", () => {
  it("keeps the legacy brand background alias aligned with brand soft", () => {
    const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

    expect(css).toContain("--color-brand-soft: #fff0e2;");
    expect(css).toContain("--color-brand-bg: #fff0e2;");
  });

  it("uses a pointer cursor for interactive controls", () => {
    const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

    expect(css).toMatch(/button:not\(:disabled\),\s*a\[href\],\s*\[role="button"\],\s*summary\s*\{\s*cursor:\s*pointer;/);
  });
});
