// @vitest-environment jsdom
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("not found");
  }),
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentEmployee: vi.fn(),
}));

const { mockRestaurantMaybeSingle } = vi.hoisted(() => ({
  mockRestaurantMaybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockRestaurantMaybeSingle,
          order: vi.fn().mockResolvedValue({ data: [] }),
        }),
        order: vi.fn().mockResolvedValue({ data: [] }),
      }),
    }),
  })),
}));

vi.mock("@/lib/reviews/queries", () => ({
  getMyReview: vi.fn(),
  hasCompletedVisit: vi.fn(),
  hasReviewAccessForSource: vi.fn(),
}));

vi.mock("@/lib/meals/queries", () => ({
  getCompletedMealSource: vi.fn(),
  getMealRecordForSource: vi.fn(),
}));

vi.mock("@/lib/review-photos/queries", () => ({
  getReviewPhotos: vi.fn(),
}));

import { getCurrentEmployee } from "@/lib/auth/session";
import { getMyReview, hasCompletedVisit } from "@/lib/reviews/queries";
import { getCompletedMealSource } from "@/lib/meals/queries";
import { getReviewPhotos } from "@/lib/review-photos/queries";
import NewReviewPage from "./page";

describe("NewReviewPage", () => {
  it("shows a photo input on the first review form", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "tester" });
    mockRestaurantMaybeSingle.mockResolvedValue({
      data: { id: "r-1", name: "First Review", category: "Korean" },
    });
    vi.mocked(hasCompletedVisit).mockResolvedValue(true);
    vi.mocked(getMyReview).mockResolvedValue(null);
    vi.mocked(getReviewPhotos).mockResolvedValue([]);
    vi.mocked(getCompletedMealSource).mockResolvedValue(null);

    const ui = await NewReviewPage({
      searchParams: Promise.resolve({ restaurantId: "r-1" }),
    });
    const { container } = render(ui);

    expect(container.querySelector('input[type="file"][name="photo"]')).toBeInTheDocument();
  });
});
