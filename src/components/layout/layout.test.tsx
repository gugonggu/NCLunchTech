// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppNavigation } from "./AppNavigation";

vi.mock("next/navigation", () => ({ usePathname: () => "/notifications" }));

describe("AppNavigation", () => {
  it("shows the five core destinations and marks the active item", () => {
    render(<AppNavigation />);

    for (const label of ["홈", "식당", "함께 먹기", "알림", "내 정보"]) {
      expect(screen.getAllByRole("link", { name: label }).length).toBeGreaterThan(0);
    }

    for (const link of screen.getAllByRole("link", { name: "알림" })) {
      expect(link).toHaveAttribute("aria-current", "page");
    }
  });

  it("uses a hidden md:flex desktop header variant", () => {
    render(<AppNavigation />);

    const desktopHeader = screen.getByRole("banner");
    expect(desktopHeader).toHaveClass("hidden");
    expect(desktopHeader).toHaveClass("md:flex");
  });
});
