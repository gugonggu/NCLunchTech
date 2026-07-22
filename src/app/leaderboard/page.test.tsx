// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentEmployee: vi.fn() }));
vi.mock("@/lib/leaderboard-queries", () => ({ getMonthlyLeaderboard: vi.fn() }));
vi.mock("@/lib/restaurant-of-the-month-queries", () => ({ getRestaurantOfTheMonth: vi.fn() }));

import { getCurrentEmployee } from "@/lib/auth/session";
import { getMonthlyLeaderboard } from "@/lib/leaderboard-queries";
import { getRestaurantOfTheMonth } from "@/lib/restaurant-of-the-month-queries";
import LeaderboardPage from "./page";

function mockLeaderboard() {
  vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트" });
  vi.mocked(getMonthlyLeaderboard).mockResolvedValue({
    label: "2026년 7월",
    categories: {
      review: { leaders: [], myRank: null },
      explorer: { leaders: [], myRank: null },
      menu: { leaders: [], myRank: null },
    },
  });
}

describe("LeaderboardPage", () => {
  it("리더보드 상단에 이번 달의 식당 요약을 표시한다", async () => {
    mockLeaderboard();
    vi.mocked(getRestaurantOfTheMonth).mockResolvedValue({
      restaurantId: "r-1", restaurantName: "복만당", restaurantCategory: "중식", completedVisitCount: 3,
      averageTasteRating: 4.5, latestCompletedAt: "2026-07-15T03:00:00.000Z", selectionReason: "most_completed_visits",
    });

    render(await LeaderboardPage());

    expect(screen.getByRole("heading", { name: "이번 달의 식당" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /복만당/ })).toHaveAttribute("href", "/restaurants/r-1");
  });

  it("후보가 없으면 리더보드 요약을 숨긴다", async () => {
    mockLeaderboard();
    vi.mocked(getRestaurantOfTheMonth).mockResolvedValue(null);

    render(await LeaderboardPage());

    expect(screen.queryByRole("heading", { name: "이번 달의 식당" })).not.toBeInTheDocument();
  });
});
