import { expect, it } from "vitest";
import { buildMonthlySummary } from "./monthly-summary";

it("이번 달 활동과 최다 방문 식당을 집계한다", () => {
  expect(buildMonthlySummary({ visits: [{ restaurantId: "r1", occurredAt: "2026-07-10T03:00:00.000Z" }, { restaurantId: "r1", occurredAt: "2026-07-11T03:00:00.000Z" }], reviews: ["2026-07-12T03:00:00.000Z"], meals: ["2026-07-13T03:00:00.000Z"] }, new Map([["r1", "복만당"]]), new Date("2026-07-20T03:00:00.000Z"))).toMatchObject({ completedVisitCount: 2, newRestaurantCount: 1, reviewCount: 1, mealRecordCount: 1, mostVisitedRestaurant: { name: "복만당", count: 2 } });
});

it("월간 활동 기준으로 자동 배지를 계산한다", () => {
  const summary = buildMonthlySummary({ visits: [{ restaurantId: "r1", occurredAt: "2026-07-10T03:00:00.000Z" }, { restaurantId: "r2", occurredAt: "2026-07-11T03:00:00.000Z" }, { restaurantId: "r3", occurredAt: "2026-07-12T03:00:00.000Z" }], reviews: ["2026-07-12T03:00:00.000Z", "2026-07-13T03:00:00.000Z", "2026-07-14T03:00:00.000Z"], meals: ["2026-07-12T03:00:00.000Z", "2026-07-13T03:00:00.000Z", "2026-07-14T03:00:00.000Z"] }, new Map(), new Date("2026-07-20T03:00:00.000Z"));
  expect(summary.badges).toEqual(["리뷰왕", "점심 개척왕", "메뉴 수집왕"]);
});
