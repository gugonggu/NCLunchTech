// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppNavigation } from "./AppNavigation";
import { AuthShell } from "./AuthShell";

const pathname = vi.hoisted(() => ({ value: "/notifications" }));

vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

describe("AppNavigation", () => {
  beforeEach(() => {
    pathname.value = "/notifications";
  });

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

  it("uses the canonical visible service name", () => {
    render(<AppNavigation />);

    expect(screen.getByRole("link", { name: "앤시점심기술" })).toHaveAttribute("href", "/");
    expect(screen.queryByText("엔씨런치테크")).not.toBeInTheDocument();
  });

  it.each(["/appointments/new", "/appointments/appointment-1"])(
    "marks 함께 먹기 active for %s",
    (activePath) => {
      pathname.value = activePath;
      render(<AppNavigation />);

      for (const link of screen.getAllByRole("link", { name: "함께 먹기" })) {
        expect(link).toHaveAttribute("aria-current", "page");
      }
    },
  );
});

describe("AuthShell", () => {
  it("uses the canonical service name and an accessible dark brand foreground", () => {
    render(<AuthShell>인증 양식</AuthShell>);

    expect(screen.getByText("앤시점심기술")).toBeInTheDocument();
    expect(screen.queryByText("엔씨런치테크")).not.toBeInTheDocument();
    expect(screen.getByText("앤시점심기술").closest("section")).toHaveClass(
      "bg-brand",
      "text-black",
    );
  });
});
