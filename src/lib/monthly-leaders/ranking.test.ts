import { describe, expect, it } from "vitest";
import { buildMonthlyLeaderEntries } from "./ranking";

describe("buildMonthlyLeaderEntries", () => {
  it("sums the three activity scores and counts each restaurant only once", () => {
    const result = buildMonthlyLeaderEntries(
      [
        { id: "a", nickname: "가", isActive: true },
        { id: "b", nickname: "나", isActive: true },
      ],
      {
        reviews: [{ employeeId: "a", occurredAt: "2026-07-10T03:00:00.000Z" }],
        visits: [
          { employeeId: "a", restaurantId: "r1", occurredAt: "2026-07-11T03:00:00.000Z" },
          { employeeId: "a", restaurantId: "r1", occurredAt: "2026-07-12T03:00:00.000Z" },
          { employeeId: "a", restaurantId: "r2", occurredAt: "2026-07-13T03:00:00.000Z" },
        ],
        mealRecords: [{ employeeId: "a", occurredAt: "2026-07-14T03:00:00.000Z" }],
      },
      new Date("2026-07-20T03:00:00.000Z")
    );

    expect(result).toEqual({
      monthKey: "2026-07-01",
      entries: [
        {
          employeeId: "a",
          nickname: "가",
          reviewScore: 1,
          explorerScore: 2,
          menuScore: 1,
          totalScore: 4,
          rank: 1,
          isMonthlyLeader: true,
        },
      ],
    });
  });

  it("ignores activity outside the Seoul month and excludes active employees with no score", () => {
    const result = buildMonthlyLeaderEntries(
      [
        { id: "a", nickname: "가", isActive: true },
        { id: "b", nickname: "나", isActive: true },
        { id: "inactive", nickname: "다", isActive: false },
      ],
      {
        reviews: [
          { employeeId: "a", occurredAt: "2026-06-30T14:59:59.999Z" },
          { employeeId: "a", occurredAt: "2026-07-31T15:00:00.000Z" },
          { employeeId: "inactive", occurredAt: "2026-07-10T03:00:00.000Z" },
        ],
        visits: [],
        mealRecords: [],
      },
      new Date("2026-07-20T03:00:00.000Z")
    );

    expect(result.entries).toEqual([]);
  });

  it("assigns tied highest totals competition rank one and marks both monthly leaders", () => {
    const result = buildMonthlyLeaderEntries(
      [
        { id: "a", nickname: "가", isActive: true },
        { id: "b", nickname: "나", isActive: true },
        { id: "c", nickname: "다", isActive: true },
      ],
      {
        reviews: [
          { employeeId: "a", occurredAt: "2026-07-10T03:00:00.000Z" },
          { employeeId: "b", occurredAt: "2026-07-10T03:00:00.000Z" },
          { employeeId: "c", occurredAt: "2026-07-10T03:00:00.000Z" },
        ],
        visits: [
          { employeeId: "a", restaurantId: "r1", occurredAt: "2026-07-11T03:00:00.000Z" },
          { employeeId: "b", restaurantId: "r2", occurredAt: "2026-07-11T03:00:00.000Z" },
        ],
        mealRecords: [{ employeeId: "c", occurredAt: "2026-07-12T03:00:00.000Z" }],
      },
      new Date("2026-07-20T03:00:00.000Z")
    );

    expect(result.entries.map(({ nickname, totalScore, rank, isMonthlyLeader }) => ({ nickname, totalScore, rank, isMonthlyLeader }))).toEqual([
      { nickname: "가", totalScore: 2, rank: 1, isMonthlyLeader: true },
      { nickname: "나", totalScore: 2, rank: 1, isMonthlyLeader: true },
      { nickname: "다", totalScore: 2, rank: 1, isMonthlyLeader: true },
    ]);
  });
});
