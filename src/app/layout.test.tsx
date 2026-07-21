import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getCurrentEmployee: vi.fn().mockResolvedValue(null),
}));

import RootLayout from "./layout";

describe("RootLayout", () => {
  it("keeps a full-height flex canvas for public pages", async () => {
    const tree = await RootLayout({ children: <main>공개 페이지</main> });
    const body = tree.props.children;
    const publicCanvas = body.props.children;

    expect(publicCanvas.type).toBe("div");
    expect(publicCanvas.props.className).toContain("flex");
    expect(publicCanvas.props.className).toContain("min-h-screen");
    expect(publicCanvas.props.className).toContain("flex-col");
  });
});
