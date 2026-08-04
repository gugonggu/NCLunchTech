// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentEmployee: vi.fn() }));
vi.mock("@/lib/leaderboard-queries", () => ({ getMonthlyLeaderboard: vi.fn() }));
vi.mock("@/lib/monthly-leaders/queries", () => ({
  getFinalizedMonthlyLeaderboard: vi.fn(),
  getMonthlyLeaderboardMonths: vi.fn(),
}));
vi.mock("@/lib/restaurant-of-the-month-queries", () => ({ getRestaurantOfTheMonth: vi.fn() }));

import { getCurrentEmployee } from "@/lib/auth/session";
import { getMonthlyLeaderboard } from "@/lib/leaderboard-queries";
import { getFinalizedMonthlyLeaderboard, getMonthlyLeaderboardMonths } from "@/lib/monthly-leaders/queries";
import { getRestaurantOfTheMonth } from "@/lib/restaurant-of-the-month-queries";
import LeaderboardPage from "./page";

afterEach(() => vi.resetAllMocks());

function mockCurrentLeaderboard() {
  vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "current leader" });
  vi.mocked(getMonthlyLeaderboard).mockResolvedValue({
    label: "Current month",
    categories: {
      review: { leaders: [], myRank: null },
      explorer: { leaders: [], myRank: null },
      menu: { leaders: [], myRank: null },
      total: { leaders: [{ employeeId: "emp-1", nickname: "current leader", score: 4, rank: 1 }], myRank: { score: 4, rank: 1 } },
    },
  });
  vi.mocked(getMonthlyLeaderboardMonths).mockResolvedValue([{ monthKey: "2026-07", label: "Past July" }]);
  vi.mocked(getFinalizedMonthlyLeaderboard).mockResolvedValue(null);
}

describe("LeaderboardPage", () => {
  it("keeps the current month restaurant summary when a restaurant exists", async () => {
    mockCurrentLeaderboard();
    vi.mocked(getRestaurantOfTheMonth).mockResolvedValue({
      restaurantId: "r-1", restaurantName: "Restaurant A", restaurantCategory: "Korean", completedVisitCount: 3,
      averageTasteRating: 4.5, latestCompletedAt: "2026-07-15T03:00:00.000Z", selectionReason: "most_completed_visits",
    });

    render(await LeaderboardPage());

    expect(screen.getByRole("link", { name: /Restaurant A/ })).toHaveAttribute("href", "/restaurants/r-1");
  });

  it("hides the current month restaurant summary when no restaurant exists", async () => {
    mockCurrentLeaderboard();
    vi.mocked(getRestaurantOfTheMonth).mockResolvedValue(null);

    render(await LeaderboardPage());

    expect(screen.queryByRole("link", { name: /Restaurant A/ })).not.toBeInTheDocument();
  });

  it("renders a finalized month from its snapshot with every total rank and score detail", async () => {
    mockCurrentLeaderboard();
    vi.mocked(getFinalizedMonthlyLeaderboard).mockResolvedValue({
      monthKey: "2026-07-01",
      myEntry: null,
      entries: [
        {
          employeeId: "emp-1", nickname: "past leader", reviewScore: 2, explorerScore: 1, menuScore: 1,
          totalScore: 4, rank: 1, isMonthlyLeader: true,
        },
        {
          employeeId: "emp-2", nickname: "second place", reviewScore: 1, explorerScore: 1, menuScore: 0,
          totalScore: 2, rank: 2, isMonthlyLeader: false,
        },
      ],
    });

    render(await LeaderboardPage({ searchParams: Promise.resolve({ month: "2026-07" }) }));

    expect(screen.getByRole("option", { name: "Past July" })).toBeInTheDocument();
    expect(screen.getByText(/1.*past leader/)).toBeInTheDocument();
    expect(screen.getByText(/2.*second place/)).toBeInTheDocument();
    expect(screen.getByText(/2.*1.*1/)).toBeInTheDocument();
    expect(screen.getByText("이달의 리더")).toBeInTheDocument();
    expect(screen.queryByText("current leader")).not.toBeInTheDocument();
  });

  it("falls back to the current board for an invalid or unfinalized month", async () => {
    mockCurrentLeaderboard();
    vi.mocked(getRestaurantOfTheMonth).mockResolvedValue(null);

    render(await LeaderboardPage({ searchParams: Promise.resolve({ month: "2026-06" }) }));

    expect(screen.getByText(/1.*current leader/)).toBeInTheDocument();
    expect(screen.queryByText("past leader")).not.toBeInTheDocument();
    expect(getFinalizedMonthlyLeaderboard).not.toHaveBeenCalled();
  });
});
