import { describe, expect, it } from "vitest";
import { selectRestaurantOfTheMonth } from "./restaurant-of-the-month";

const now = new Date("2026-07-20T03:00:00.000Z");
const restaurants = [
  { id: "a", name: "가람", category: "한식", isActive: true },
  { id: "b", name: "나루", category: "중식", isActive: true },
  { id: "inactive", name: "다온", category: "일식", isActive: false },
];

describe("selectRestaurantOfTheMonth", () => {
  it("완료 방문 수가 가장 많은 식당을 선정한다", () => {
    const result = selectRestaurantOfTheMonth(
      restaurants,
      {
        visits: [
          { restaurantId: "a", occurredAt: "2026-07-10T03:00:00.000Z" },
          { restaurantId: "a", occurredAt: "2026-07-11T03:00:00.000Z" },
          { restaurantId: "b", occurredAt: "2026-07-12T03:00:00.000Z" },
        ],
        reviews: [{ restaurantId: "b", tasteRating: 5, occurredAt: "2026-07-13T03:00:00.000Z" }],
      },
      now
    );

    expect(result).toMatchObject({ restaurantId: "a", completedVisitCount: 2, selectionReason: "most_completed_visits" });
  });

  it("방문 수 동률이면 평균 맛 점수가 높은 식당을 선정한다", () => {
    const result = selectRestaurantOfTheMonth(
      restaurants,
      {
        visits: [
          { restaurantId: "a", occurredAt: "2026-07-10T03:00:00.000Z" },
          { restaurantId: "a", occurredAt: "2026-07-11T03:00:00.000Z" },
          { restaurantId: "b", occurredAt: "2026-07-12T03:00:00.000Z" },
          { restaurantId: "b", occurredAt: "2026-07-13T03:00:00.000Z" },
        ],
        reviews: [
          { restaurantId: "a", tasteRating: 4, occurredAt: "2026-07-14T03:00:00.000Z" },
          { restaurantId: "b", tasteRating: 5, occurredAt: "2026-07-14T03:00:00.000Z" },
        ],
      },
      now
    );

    expect(result).toMatchObject({ restaurantId: "b", averageTasteRating: 5, selectionReason: "highest_taste_rating" });
  });

  it("리뷰가 없는 후보는 최신 완료 방문 시각으로 동률을 해소한다", () => {
    const result = selectRestaurantOfTheMonth(
      restaurants,
      {
        visits: [
          { restaurantId: "a", occurredAt: "2026-07-10T03:00:00.000Z" },
          { restaurantId: "b", occurredAt: "2026-07-11T03:00:00.000Z" },
        ],
        reviews: [],
      },
      now
    );

    expect(result).toMatchObject({ restaurantId: "b", averageTasteRating: null, selectionReason: "latest_completed_visit" });
  });

  it("모든 수치가 같으면 식당 이름 오름차순으로 선정한다", () => {
    const result = selectRestaurantOfTheMonth(
      restaurants,
      {
        visits: [
          { restaurantId: "a", occurredAt: "2026-07-10T03:00:00.000Z" },
          { restaurantId: "b", occurredAt: "2026-07-10T03:00:00.000Z" },
        ],
        reviews: [],
      },
      now
    );

    expect(result).toMatchObject({ restaurantId: "a", selectionReason: "name_tiebreak" });
  });

  it("월 밖 활동과 비활성 식당은 후보에서 제외한다", () => {
    const result = selectRestaurantOfTheMonth(
      restaurants,
      {
        visits: [
          { restaurantId: "a", occurredAt: "2026-06-30T14:59:59.000Z" },
          { restaurantId: "b", occurredAt: "2026-07-10T03:00:00.000Z" },
          { restaurantId: "inactive", occurredAt: "2026-07-11T03:00:00.000Z" },
        ],
        reviews: [],
      },
      now
    );

    expect(result).toMatchObject({ restaurantId: "b", completedVisitCount: 1 });
  });

  it("이번 달 완료 방문 후보가 없으면 null을 반환한다", () => {
    expect(selectRestaurantOfTheMonth(restaurants, { visits: [], reviews: [] }, now)).toBeNull();
  });
});
