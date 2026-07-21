// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigationHarness = vi.hoisted(() => {
  let resolveNavigation: () => void = () => undefined;
  return {
    lastUrl: "",
    promise: Promise.resolve(),
    reset() {
      this.lastUrl = "";
      this.promise = new Promise<void>((resolve) => {
        resolveNavigation = resolve;
      });
    },
    resolve() {
      resolveNavigation();
    },
  };
});

vi.mock("next/form", async () => {
  const React = await import("react");
  return {
    default: ({
      action,
      children,
      ...props
    }: {
      action: string;
      children: React.ReactNode;
    }) => {
      async function navigate(formData: FormData) {
        const params = new URLSearchParams();
        for (const [name, value] of formData.entries()) {
          if (typeof value === "string") {
            params.append(name, value);
          }
        }
        navigationHarness.lastUrl = `${action}?${params.toString()}`;
        await navigationHarness.promise;
      }

      return React.createElement(
        "form",
        { ...props, action: navigate, "data-next-form-action": action },
        children,
      );
    },
  };
});

import { RecommendationFilters } from "./RecommendationFilters";

describe("RecommendationFilters navigation", () => {
  beforeEach(() => {
    navigationHarness.reset();
  });

  it("submits exact GET fields to /recommend and exposes pending navigation", async () => {
    const { container } = render(
      <RecommendationFilters
        idPrefix="navigation-filter"
        conditions={{
          restaurantName: "김밥 집",
          category: "한식",
          maxPriceWon: 12000,
          excludeRecentVisits: true,
        }}
        radius={800}
        hasMenuData
      />,
    );
    const form = container.querySelector("form");
    expect(form).toHaveAttribute("data-next-form-action", "/recommend");

    fireEvent.submit(form as HTMLFormElement);

    const pendingSubmit = await screen.findByRole("button", { name: "추천 조건 적용 중…" });
    expect(pendingSubmit).toBeDisabled();
    expect(pendingSubmit).toHaveAttribute("aria-busy", "true");
    expect(navigationHarness.lastUrl).toBe(
      "/recommend?q=%EA%B9%80%EB%B0%A5+%EC%A7%91&menuQ=&category=%ED%95%9C%EC%8B%9D&radius=800&maxPrice=12000&excludeRecent=on",
    );

    navigationHarness.resolve();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "이 조건으로 추천받기" })).toHaveAttribute(
        "aria-busy",
        "false",
      );
    });
  });
});
