import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("Next.js configuration", () => {
  it("accepts the largest supported review photo in a server action", () => {
    expect(nextConfig.experimental?.serverActions?.bodySizeLimit).toBe("6mb");
  });
});
