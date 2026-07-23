// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/visits/actions", () => ({
  cancelTodayVisit: vi.fn(),
  completeTodayVisit: vi.fn(),
  markTodayVisitNoShow: vi.fn(),
}));

import { HomeHero } from "./HomeHero";

const completedVisit = {
  id: "visit-1",
  restaurantId: "restaurant-1",
  status: "completed" as const,
  restaurantName: "테스트 식당",
  restaurantCategory: "한식",
  restaurantLat: 35.171,
  restaurantLng: 129.131,
  updatedAt: new Date().toISOString(),
};

describe("HomeHero", () => {
  it("keeps recommendation first and shows an unsubmitted review on the next slide", () => {
    render(
      <HomeHero
        kind="follow-up"
        todayVisit={completedVisit}
        todayMealRecord={null}
        hasTodayReview={false}
        soloNeedsConfirmation={false}
        appointmentsNeedingConfirmation={[]}
        primaryPoll={null}
        distanceM={null}
        now={new Date()}
      />,
    );

    expect(screen.getByRole("link", { name: "오늘 뭐 먹지?" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "리뷰 남기기" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "다음 Hero" }));
    fireEvent.click(screen.getByRole("button", { name: "다음 Hero" }));

    expect(screen.getByRole("link", { name: "리뷰 남기기" })).toBeVisible();
  });

  it("removes review and cancellation calls to action after a review is submitted", () => {
    render(
      <HomeHero
        kind="follow-up"
        todayVisit={completedVisit}
        todayMealRecord={null}
        hasTodayReview
        soloNeedsConfirmation={false}
        appointmentsNeedingConfirmation={[]}
        primaryPoll={null}
        distanceM={null}
        now={new Date()}
      />,
    );

    expect(screen.getByRole("link", { name: "오늘 뭐 먹지?" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "리뷰 남기기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "방문 취소" })).not.toBeInTheDocument();
  });

  it("does not keep a planned visit decision after its review is submitted", () => {
    render(
      <HomeHero
        kind="decision"
        todayVisit={{ ...completedVisit, status: "planned" }}
        todayMealRecord={null}
        hasTodayReview
        soloNeedsConfirmation={false}
        appointmentsNeedingConfirmation={[]}
        primaryPoll={null}
        distanceM={null}
        now={new Date()}
      />,
    );

    expect(screen.getByRole("link", { name: "오늘 뭐 먹지?" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "다음 Hero" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "결정 취소" })).not.toBeInTheDocument();
  });
});
