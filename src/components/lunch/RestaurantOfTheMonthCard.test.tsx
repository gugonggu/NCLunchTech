// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RestaurantOfTheMonthCard } from "./RestaurantOfTheMonthCard";

const restaurant = {
  restaurantId: "r-1",
  restaurantName: "복만당",
  restaurantCategory: "중식",
  completedVisitCount: 3,
  averageTasteRating: 4.5,
  latestCompletedAt: "2026-07-15T03:00:00.000Z",
  selectionReason: "highest_taste_rating" as const,
};

describe("RestaurantOfTheMonthCard", () => {
  it("shows selection details and links to restaurant detail", () => {
    render(<RestaurantOfTheMonthCard restaurant={restaurant} />);

    expect(screen.getByRole("heading", { name: "이번 달의 식당" })).toBeInTheDocument();
    expect(screen.getByText("복만당")).toBeInTheDocument();
    expect(screen.getByText("중식")).toBeInTheDocument();
    expect(screen.getByText("완료 방문 3회")).toBeInTheDocument();
    expect(screen.getByText("평균 맛 4.5점")).toBeInTheDocument();
    expect(screen.getByText("동률 식당 중 평균 맛 점수가 가장 높아요.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /복만당/ })).toHaveAttribute("href", "/restaurants/r-1");
  });

  it("shows only compact summary details in compact mode", () => {
    render(<RestaurantOfTheMonthCard restaurant={restaurant} compact />);

    expect(screen.getByRole("link", { name: /복만당/ })).toHaveAttribute("href", "/restaurants/r-1");
    expect(screen.getByText("완료 방문 3회")).toBeInTheDocument();
    expect(screen.getByText("평균 맛 4.5점")).toBeInTheDocument();
    expect(screen.queryByText("중식")).not.toBeInTheDocument();
    expect(screen.queryByText("동률 식당 중 평균 맛 점수가 가장 높아요.")).not.toBeInTheDocument();
  });
});
