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
  getFinalizedMonthlyLeaderboard,
  getLatestMonthlyLeaderBadges,
  getMonthlyLeaderHistory,
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
  it("orders every paginated source before requesting its first page", async () => {
    const ordersByTable = new Map<string, Array<[string, { ascending?: boolean } | undefined]>>();
    const rangesByTable = new Map<string, Array<[number, number]>>();
    const createQuery = (table: string) => {
      ordersByTable.set(table, []);
      rangesByTable.set(table, []);
      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        order: vi.fn(),
        range: vi.fn(async (from: number, to: number) => {
          rangesByTable.get(table)?.push([from, to]);
          return { data: [], error: null };
        }),
      };
      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      query.order.mockImplementation((column: string, options?: { ascending?: boolean }) => {
        ordersByTable.get(table)?.push([column, options]);
        return query;
      });
      return query;
    };
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    mocks.createServiceRoleClient.mockReturnValue({ from: vi.fn(createQuery), rpc });
    mocks.fetchAllRows.mockReset();
    mocks.fetchAllRows.mockImplementation(async (fetchPage: (from: number, to: number) => PromiseLike<unknown>) => {
      await fetchPage(0, 999);
      return [];
    });

    await finalizeMissingMonthlyLeaderboards(new Date("2026-07-31T15:00:00.000Z"));

    expect(rangesByTable).toEqual(
      new Map([
        ["monthly_leaderboard_periods", [[0, 999]]],
        ["employees", [[0, 999]]],
        ["reviews", [[0, 999]]],
        ["visits", [[0, 999]]],
        ["appointments", [[0, 999]]],
        ["appointment_participants", [[0, 999]]],
        ["meal_records", [[0, 999]]],
      ])
    );
    expect(ordersByTable).toEqual(
      new Map([
        ["monthly_leaderboard_periods", [["month_key", { ascending: true }], ["id", { ascending: true }]]],
        ["employees", [["id", { ascending: true }]]],
        ["reviews", [["created_at", { ascending: true }], ["id", { ascending: true }]]],
        ["visits", [["visit_date", { ascending: true }], ["id", { ascending: true }]]],
        ["appointments", [["scheduled_at", { ascending: true }], ["id", { ascending: true }]]],
        ["appointment_participants", [["created_at", { ascending: true }], ["id", { ascending: true }]]],
        ["meal_records", [["created_at", { ascending: true }], ["id", { ascending: true }]]],
      ])
    );
  });

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

  it("backfills every empty completed month after an existing snapshot", async () => {
    const { rpc } = arrangeFinalization({
      periods: [{ id: "period-june", month_key: "2026-06-01" }],
    });

    await finalizeMissingMonthlyLeaderboards(new Date("2026-08-31T15:00:00.000Z"));

    expect(rpc.mock.calls.map((call) => call[1].p_month_key)).toEqual(["2026-07-01", "2026-08-01"]);
    expect(rpc.mock.calls.map((call) => call[1].p_entries)).toEqual([[], []]);
  });

  it("finalizes July, but not August, at midnight on August 1 in Seoul", async () => {
    const { rpc } = arrangeFinalization();

    await finalizeMissingMonthlyLeaderboards(new Date("2026-07-31T15:00:00.000Z"));

    expect(rpc.mock.calls.map((call) => call[1].p_month_key)).toEqual(["2026-07-01"]);
  });
});

describe("getFinalizedMonthlyLeaderboard", () => {
  it("orders snapshot entries by rank, score, Korean nickname, then employee", async () => {
    const entryOrders: Array<[string, { ascending?: boolean } | undefined]> = [];
    const periodQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "period-1", month_key: "2026-07-01" }, error: null }),
    };
    periodQuery.select.mockReturnValue(periodQuery);
    periodQuery.eq.mockReturnValue(periodQuery);
    const entriesQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
    };
    entriesQuery.select.mockReturnValue(entriesQuery);
    entriesQuery.eq.mockReturnValue(entriesQuery);
    entriesQuery.order.mockImplementation((column: string, options?: { ascending?: boolean }) => {
      entryOrders.push([column, options]);
      return entryOrders.length === 4 ? Promise.resolve({ data: [], error: null }) : entriesQuery;
    });
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => (table === "monthly_leaderboard_periods" ? periodQuery : entriesQuery)),
    });

    await getFinalizedMonthlyLeaderboard("2026-07", "employee-1");

    expect(entryOrders).toEqual([
      ["rank", { ascending: true }],
      ["total_score", { ascending: false }],
      ["nickname_snapshot", { ascending: true }],
      ["employee_id", { ascending: true }],
    ]);
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

describe("getMonthlyLeaderHistory", () => {
  it("returns every awarded month for one employee without any score fields", async () => {
    const entriesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { period_id: "period-july", is_monthly_leader: true },
          { period_id: "period-june", is_monthly_leader: true },
        ],
        error: null,
      }),
    };
    const periodsQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { id: "period-july", month_key: "2026-07-01" },
          { id: "period-june", month_key: "2026-06-01" },
        ],
        error: null,
      }),
    };
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => (table === "monthly_leaderboard_entries" ? entriesQuery : periodsQuery)),
    });

    await expect(getMonthlyLeaderHistory("employee-1")).resolves.toEqual([
      { monthKey: "2026-07-01" },
      { monthKey: "2026-06-01" },
    ]);
    expect(entriesQuery.select).toHaveBeenCalledWith("period_id");
  });
});
