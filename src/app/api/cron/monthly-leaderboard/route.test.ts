import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ finalize: vi.fn() }));

vi.mock("@/lib/monthly-leaders/queries", () => ({
  finalizeMissingMonthlyLeaderboards: mocks.finalize,
}));

import { GET } from "./route";

describe("GET /api/cron/monthly-leaderboard", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    mocks.finalize.mockReset();
  });

  it("returns 401 unless the authorization header exactly matches the configured secret", async () => {
    vi.stubEnv("CRON_SECRET", "cron-secret");

    const response = await GET(new Request("http://localhost/api/cron/monthly-leaderboard", {
      headers: { Authorization: "Bearer wrong-secret" },
    }));

    expect(response.status).toBe(401);
    expect(mocks.finalize).not.toHaveBeenCalled();
  });

  it("does nothing on Seoul dates other than the first after successful authorization", async () => {
    vi.stubEnv("CRON_SECRET", "cron-secret");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T03:00:00.000Z"));

    const response = await GET(new Request("http://localhost/api/cron/monthly-leaderboard", {
      headers: { Authorization: "Bearer cron-secret" },
    }));

    expect(response.status).toBe(204);
    expect(mocks.finalize).not.toHaveBeenCalled();
  });

  it("finalizes on the first Seoul calendar day after successful authorization", async () => {
    vi.stubEnv("CRON_SECRET", "cron-secret");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T15:00:00.000Z"));
    mocks.finalize.mockResolvedValue(undefined);

    const response = await GET(new Request("http://localhost/api/cron/monthly-leaderboard", {
      headers: { Authorization: "Bearer cron-secret" },
    }));

    expect(response.status).toBe(200);
    expect(mocks.finalize).toHaveBeenCalledWith(new Date("2026-07-31T15:00:00.000Z"));
    await expect(response.json()).resolves.toEqual({ finalized: true });
  });
});
