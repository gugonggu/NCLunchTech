import { describe, expect, it } from "vitest";
import { buildMonthlyLeaderboard, getSeoulMonthRange } from "./leaderboard";

describe("getSeoulMonthRange", () => {
  it("서울 기준 월 시작과 다음 달 시작을 반환한다", () => {
    expect(getSeoulMonthRange(new Date("2026-07-31T15:30:00.000Z"))).toEqual({
      label: "2026년 8월",
      start: "2026-07-31T15:00:00.000Z",
      end: "2026-08-31T15:00:00.000Z",
      startDate: "2026-08-01",
      endDate: "2026-09-01",
    });
  });
});

describe("buildMonthlyLeaderboard", () => {
  it("활성 직원의 개인·약속 방문을 합산하고 중복 식당과 공동 순위를 처리한다", () => {
    const result = buildMonthlyLeaderboard(
      [
        { id: "a", nickname: "가", isActive: true },
        { id: "b", nickname: "나", isActive: true },
        { id: "test", nickname: "비활성", isActive: false },
      ],
      {
        reviews: [
          { employeeId: "a", occurredAt: "2026-06-30T15:00:00.000Z" },
          { employeeId: "a", occurredAt: "2026-07-10T03:00:00.000Z" },
          { employeeId: "b", occurredAt: "2026-07-11T03:00:00.000Z" },
          { employeeId: "b", occurredAt: "2026-07-12T03:00:00.000Z" },
          { employeeId: "test", occurredAt: "2026-07-12T03:00:00.000Z" },
          { employeeId: "a", occurredAt: "2026-07-31T15:00:00.000Z" },
        ],
        visits: [
          { employeeId: "a", restaurantId: "r1", occurredAt: "2026-07-01T03:00:00.000Z" },
          { employeeId: "a", restaurantId: "r1", occurredAt: "2026-07-02T03:00:00.000Z" },
          { employeeId: "a", restaurantId: "r2", occurredAt: "2026-07-03T03:00:00.000Z" },
          { employeeId: "b", restaurantId: "r3", occurredAt: "2026-07-03T03:00:00.000Z" },
        ],
        mealRecords: [
          { employeeId: "a", occurredAt: "2026-07-04T03:00:00.000Z" },
          { employeeId: "b", occurredAt: "2026-07-04T03:00:00.000Z" },
          { employeeId: "b", occurredAt: "2026-07-05T03:00:00.000Z" },
        ],
      },
      "a",
      new Date("2026-07-20T03:00:00.000Z")
    );

    expect(result.categories.review.leaders.map(({ nickname, score, rank }) => ({ nickname, score, rank }))).toEqual([
      { nickname: "가", score: 2, rank: 1 },
      { nickname: "나", score: 2, rank: 1 },
    ]);
    expect(result.categories.explorer.myRank).toEqual({ score: 2, rank: 1 });
    expect(result.categories.menu.leaders.map(({ nickname, score, rank }) => ({ nickname, score, rank }))).toEqual([
      { nickname: "나", score: 2, rank: 1 },
      { nickname: "가", score: 1, rank: 2 },
    ]);
  });
});
