import { describe, expect, it } from "vitest";
import { mapRecentReviewRows } from "./queries";

describe("mapRecentReviewRows", () => {
  it("attaches only the matching review photos and the reviewer's latest meal record", () => {
    const result = mapRecentReviewRows(
      [
        {
          id: "review-1",
          employee_id: "emp-1",
          taste_rating: 5,
          speed_rating: 4,
          price_rating: 3,
          solo_fit_rating: 5,
          one_line_review: "좋았어요",
          tags: ["빨리 나와요"],
          employees: { nickname: "홍천" },
        },
        {
          id: "review-2",
          employee_id: "emp-2",
          taste_rating: 3,
          speed_rating: 3,
          price_rating: 4,
          solo_fit_rating: 2,
          one_line_review: null,
          tags: null,
          employees: { nickname: "나래" },
        },
      ],
      [
        { id: "photo-1", review_id: "review-1", storage_path: "review-1/a.jpg", created_at: "2026-07-22T01:00:00Z" },
        { id: "photo-2", review_id: "review-2", storage_path: "review-2/b.jpg", created_at: "2026-07-22T02:00:00Z" },
      ],
      [
        {
          employee_id: "emp-1",
          menu_name_snapshot: "제육볶음",
          paid_price: 9500,
          created_at: "2026-07-22T03:00:00Z",
        },
      ],
      (path) => `https://photos.test/${path}`,
    );

    expect(result[0]).toMatchObject({
      id: "review-1",
      employeeNickname: "홍천",
      tasteRating: 5,
      mealRecord: { menuName: "제육볶음", paidPrice: 9500 },
      photos: [{ id: "photo-1", url: "https://photos.test/review-1/a.jpg" }],
    });
    expect(result[1]).toMatchObject({
      id: "review-2",
      employeeNickname: "나래",
      mealRecord: null,
      photos: [{ id: "photo-2", url: "https://photos.test/review-2/b.jpg" }],
    });
  });
});
