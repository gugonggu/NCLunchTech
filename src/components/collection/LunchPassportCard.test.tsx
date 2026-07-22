// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LunchPassportCard } from "./LunchPassportCard";

describe("LunchPassportCard", () => {
  it("방문한 식당과 미방문 카테고리를 표시한다", () => {
    render(<LunchPassportCard passport={{ totalRestaurantCount: 5, visitedRestaurantCount: 2, completionRate: 0.4, categories: [
      { category: "한식", totalRestaurantCount: 3, visitedRestaurantCount: 1, completionRate: 1 / 3, restaurants: [{ restaurantId: "r1", restaurantName: "가람", visitCount: 2, firstVisitedOn: "2026-07-01", lastVisitedOn: "2026-07-10" }] },
      { category: "중식", totalRestaurantCount: 2, visitedRestaurantCount: 0, completionRate: 0, restaurants: [] },
    ] }} />);

    expect(screen.getByRole("heading", { name: "점심 여권" })).toBeInTheDocument();
    expect(screen.getByText("2/5곳 방문")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /가람/ })).toHaveAttribute("href", "/restaurants/r1");
    expect(screen.getByText("방문 2회 · 첫 방문 7월 1일 · 최근 방문 7월 10일")).toBeInTheDocument();
    expect(screen.getByText("중식 · 아직 방문 전")).toBeInTheDocument();
  });
});
