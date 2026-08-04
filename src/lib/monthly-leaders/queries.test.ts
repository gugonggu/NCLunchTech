import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  fetchAllRows: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

vi.mock("@/lib/supabase/fetch-all", () => ({
  fetchAllRows: mocks.fetchAllRows,
}));

import {
  finalizeMissingMonthlyLeaderboards,
  getLatestMonthlyLeaderBadges,
} from "./queries";

function arrangeFinalization({
  periods = [],
  employees = [{ id: "employee-1", nickname: "Leader", is_active: true }],
  reviews = [],
  visits = [],
  hostedAppointments = [],
  participantRows = [],
  mealRecords = [],
}: {
  periods?: unknown[];
  employees?: unknown[];
  reviews?: unknown[];
  visits?: unknown[];
  hostedAppointments?: unknown[];
  participantRows?: unknown[];
  mealRecords?: unknown[];
} = {}) {
  const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
  mocks.createServiceRoleClient.mockReturnValue({ rpc });
  mocks.fetchAllRows.mockReset();
  [periods, employees, reviews, visits, hostedAppointments, participantRows, mealRecords].forEach((data) =>
    mocks.fetchAllRows.mockResolvedValueOnce(data)
  );
  return { rpc };
}

describe("finalizeMissingMonthlyLeaderboards", () => {
  it("backfills unfinalized past months oldest first and treats an existing period as idempotent", async () => {
    const { rpc } = arrangeFinalization({
      reviews: [{ employee_id: "employee-1", created_at: "2026-06-05T03:00:00.000Z" }],
    });
    rpc.mockResolvedValueOnce({ data: false, error: null });

    await finalizeMissingMonthlyLeaderboards(new Date("2026-07-31T15:00:00.000Z"));

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls.map((call) => call[1].p_month_key)).toEqual(["2026-06-01", "2026-07-01"]);
  });

  it("creates an empty prior-month period without entries", async () => {
    const { rpc } = arrangeFinalization();

    await finalizeMissingMonthlyLeaderboards(new Date("2026-07-31T15:00:00.000Z"));

    expect(rpc).toHaveBeenCalledWith("finalize_monthly_leaderboard", {
      p_month_key: "2026-07-01",
      p_entries: [],
    });
  });

  it("finalizes July, but not August, at midnight on August 1 in Seoul", async () => {
    const { rpc } = arrangeFinalization();

    await finalizeMissingMonthlyLeaderboards(new Date("2026-07-31T15:00:00.000Z"));

    expect(rpc.mock.calls.map((call) => call[1].p_month_key)).toEqual(["2026-07-01"]);
  });
});

describe("getLatestMonthlyLeaderBadges", () => {
  it("returns only each employee's newest monthly-leader snapshot", async () => {
    const leaders = [
      { employee_id: "employee-1", period_id: "period-june" },
      { employee_id: "employee-1", period_id: "period-july" },
      { employee_id: "employee-2", period_id: "period-june" },
    ];
    const periods = [
      { id: "period-june", month_key: "2026-06-01" },
      { id: "period-july", month_key: "2026-07-01" },
    ];
    const chain = (data: unknown[]) => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data, error: null }),
    });
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => chain(table === "monthly_leaderboard_entries" ? leaders : periods)),
    });

    const badges = await getLatestMonthlyLeaderBadges(["employee-1", "employee-2"]);

    expect(badges).toEqual(
      new Map([
        ["employee-1", { monthKey: "2026-07-01" }],
        ["employee-2", { monthKey: "2026-06-01" }],
      ])
    );
  });
});
