// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentEmployee: vi.fn(), createServiceRoleClient: vi.fn(), getMonthlyLeaderboard: vi.fn(),
  getMonthlySummary: vi.fn(), getSeasonalBadges: vi.fn(), getMealRecordsForEmployee: vi.fn(),
  getEarnedTitlesForEmployee: vi.fn(), getMyAvatar: vi.fn(), getMonthlyLeaderHistory: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentEmployee: mocks.getCurrentEmployee }));
vi.mock("@/lib/supabase/server", () => ({ createServiceRoleClient: mocks.createServiceRoleClient }));
vi.mock("@/lib/leaderboard-queries", () => ({ getMonthlyLeaderboard: mocks.getMonthlyLeaderboard }));
vi.mock("@/lib/monthly-summary-queries", () => ({ getMonthlySummary: mocks.getMonthlySummary }));
vi.mock("@/lib/seasonal-badges-queries", () => ({ getSeasonalBadges: mocks.getSeasonalBadges }));
vi.mock("@/lib/meals/queries", () => ({ getMealRecordsForEmployee: mocks.getMealRecordsForEmployee }));
vi.mock("@/lib/achievements/titles", () => ({ getEarnedTitlesForEmployee: mocks.getEarnedTitlesForEmployee }));
vi.mock("@/lib/avatars/queries", () => ({ getMyAvatar: mocks.getMyAvatar }));
vi.mock("@/lib/monthly-leaders/queries", () => ({ getMonthlyLeaderHistory: mocks.getMonthlyLeaderHistory }));
vi.mock("@/components/me/AvatarEditor2D", () => ({ AvatarEditor2D: () => null }));
vi.mock("@/components/me/CollapsibleSection", () => ({ CollapsibleSection: ({ children }: { children: React.ReactNode }) => <section>{children}</section> }));
vi.mock("@/components/me/MealRecordList", () => ({ MealRecordList: () => null }));
vi.mock("../LogoutButton", () => ({ LogoutButton: () => null }));

import MePage from "./page";

afterEach(() => vi.resetAllMocks());

function arrangePage() {
  const profile = { data: { created_at: "2026-01-01T00:00:00Z", real_name: "실명", selected_title_id: null, titles: null }, error: null };
  const countResult = { count: 0, error: null };
  const query = (result: typeof profile | typeof countResult) => {
    const builder = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), maybeSingle: vi.fn() };
    builder.select.mockReturnValue(builder); builder.eq.mockReturnValue(builder); builder.in.mockReturnValue(builder);
    builder.maybeSingle.mockResolvedValue(result);
    return Object.assign(builder, { then: (resolve: (value: typeof profile | typeof countResult) => unknown) => resolve(result) });
  };
  mocks.createServiceRoleClient.mockReturnValue({ from: vi.fn((table: string) => query(table === "employees" ? profile : countResult)) });
  mocks.getCurrentEmployee.mockResolvedValue({ id: "emp-1", nickname: "리더", realName: "실명" });
  mocks.getMonthlyLeaderboard.mockResolvedValue({ label: "이번 달", categories: { review: { myRank: null }, explorer: { myRank: null }, menu: { myRank: null } } });
  mocks.getMonthlySummary.mockResolvedValue({ label: "7월", completedVisitCount: 0, newRestaurantCount: 0, reviewCount: 0, mealRecordCount: 0, mostVisitedRestaurant: null, badges: [] });
  mocks.getSeasonalBadges.mockResolvedValue({ label: "여름", badges: [] }); mocks.getMealRecordsForEmployee.mockResolvedValue([]);
  mocks.getEarnedTitlesForEmployee.mockResolvedValue([]); mocks.getMyAvatar.mockResolvedValue({ options: null, previewUrl: "/avatar-default.png" });
  mocks.getMonthlyLeaderHistory.mockResolvedValue([{ monthKey: "2026-07-01" }, { monthKey: "2026-06-01" }]);
}

describe("MePage", () => {
  it("shows every monthly leader award without exposing leaderboard scores", async () => {
    arrangePage();
    render(await MePage({}));

    expect(screen.getByText("2026년 7월 이달의 리더")).toBeInTheDocument();
    expect(screen.getByText("2026년 6월 이달의 리더")).toBeInTheDocument();
    expect(screen.queryByText(/점수|score|4/iu)).not.toBeInTheDocument();
  });
});
