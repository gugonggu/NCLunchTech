// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecommendationCard } from "./RecommendationCard";

const restaurant = {
  id: "r1",
  name: "아주 긴 이름의 테스트 한식당",
  category: "한식",
  distanceM: 480,
  isActive: true,
  menuItems: [{ name: "제육볶음", price: 9000 }],
  lat: 35.1,
  lng: 129.1,
};

describe("RecommendationCard", () => {
  it("makes the decision the primary action and keeps secondary links", () => {
    render(
      <RecommendationCard
        restaurant={restaurant}
        photoUrl={null}
        reasons={["가깝고 평가가 좋아요"]}
        reviewCount={4}
        variant="hero"
        decideAction={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "여기로 결정" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "상세 보기" })).toHaveAttribute(
      "href",
      "/restaurants/r1",
    );
    expect(screen.getByRole("link", { name: "동료와 함께" })).toHaveAttribute(
      "href",
      "/appointments/new?restaurantId=r1",
    );
  });

  it("uses an accessible category fallback when there is no photo", () => {
    render(
      <RecommendationCard
        restaurant={restaurant}
        photoUrl={null}
        reviewCount={0}
        variant="alternative"
        decideAction={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("img", {
        name: "아주 긴 이름의 테스트 한식당 이미지 준비 중",
      }),
    ).toBeInTheDocument();
  });
});
