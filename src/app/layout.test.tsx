import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getCurrentEmployee: vi.fn().mockResolvedValue(null),
}));

import RootLayout from "./layout";

describe("RootLayout", () => {
  it("keeps a full-height flex canvas for public pages", async () => {
    const tree = await RootLayout({ children: <main>공개 페이지</main> });
    const body = tree.props.children;
    const bodyChildren = Array.isArray(body.props.children) ? body.props.children : [body.props.children];
    const publicCanvas = bodyChildren[bodyChildren.length - 1];

    expect(publicCanvas.type).toBe("div");
    expect(publicCanvas.props.className).toContain("flex");
    expect(publicCanvas.props.className).toContain("min-h-dvh");
    expect(publicCanvas.props.className).toContain("flex-col");
  });
});
