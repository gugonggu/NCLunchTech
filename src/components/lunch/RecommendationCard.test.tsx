// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecommendationCard } from "./RecommendationCard";
import { RestaurantVisual } from "./RestaurantVisual";

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

    const card = screen.getByRole("article", {
      name: "아주 긴 이름의 테스트 한식당 추천",
    });
    const decideButton = screen.getByRole("button", { name: "여기로 결정" });
    const appointmentLink = screen.getByRole("link", {
      name: "동료와 함께",
    });
    const detailLink = screen.getByRole("link", { name: "상세 보기" });

    expect(card).toHaveClass("bg-brand-soft");
    expect(decideButton).toHaveClass("min-h-12", "min-w-11", "w-full");
    expect(appointmentLink).toHaveClass(
      "min-h-12",
      "min-w-11",
      "w-full",
      "border",
      "border-line",
      "bg-surface",
      "text-ink",
    );
    expect(detailLink).toHaveClass(
      "min-h-12",
      "min-w-11",
      "w-full",
      "bg-transparent",
      "text-ink-muted",
    );
    expect(
      decideButton.compareDocumentPosition(appointmentLink) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      appointmentLink.compareDocumentPosition(detailLink) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(detailLink).toHaveAttribute(
      "href",
      "/restaurants/r1",
    );
    expect(appointmentLink).toHaveAttribute(
      "href",
      "/appointments/new?restaurantId=r1",
    );
  });

  it("keeps all alternative actions available with low emphasis", () => {
    const decideAction = vi.fn();
    const { container } = render(
      <RecommendationCard
        restaurant={restaurant}
        photoUrl={null}
        reviewCount={0}
        variant="alternative"
        decideAction={decideAction}
      />,
    );

    const card = screen.getByRole("article", {
      name: "아주 긴 이름의 테스트 한식당 추천",
    });
    const decideButton = screen.getByRole("button", { name: "여기로 결정" });
    const appointmentLink = screen.getByRole("link", { name: "동료와 함께" });
    const detailLink = screen.getByRole("link", { name: "상세 보기" });

    expect(card).toHaveClass("bg-surface");
    expect(decideButton).toHaveClass("min-h-11", "border", "border-line", "bg-surface");
    expect(appointmentLink).toHaveClass("min-h-11", "bg-transparent", "text-ink-muted");
    expect(detailLink).toHaveClass("min-h-11", "min-w-11", "w-full");
    expect(appointmentLink).toHaveAttribute("href", "/appointments/new?restaurantId=r1");
    expect(detailLink).toHaveAttribute("href", "/restaurants/r1");

    const decisionForm = container.querySelector("form");
    expect(decisionForm).not.toBeNull();
    fireEvent.submit(decisionForm as HTMLFormElement);
    expect(decideAction).toHaveBeenCalledTimes(1);
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

    const fallback = screen.getByRole("img", {
      name: "아주 긴 이름의 테스트 한식당 이미지 준비 중",
    });

    expect(fallback).toHaveClass("aspect-[4/3]");
    expect(fallback.textContent).toBe("한식");
    expect(fallback.firstElementChild).toHaveClass(
      "text-sm",
      "font-semibold",
      "text-ink-muted",
    );
  });

  it("shows an explicit unavailable price for a menu without a price", () => {
    render(
      <RecommendationCard
        restaurant={{
          ...restaurant,
          menuItems: [{ name: "오늘의 메뉴", price: null }],
        }}
        photoUrl={null}
        reviewCount={0}
        variant="alternative"
        decideAction={vi.fn()}
      />,
    );

    expect(screen.getByText(/오늘의 메뉴 가격 정보 없음/)).toBeInTheDocument();
  });
});

describe("RestaurantVisual", () => {
  it("uses exact photo alt text and the hero aspect ratio", () => {
    render(
      <RestaurantVisual
        name="테스트 식당"
        category="한식"
        photoUrl="https://photos.test/hero.jpg"
        priority
      />,
    );

    expect(
      screen.getByRole("img", { name: "테스트 식당 음식 사진" }),
    ).toHaveClass("aspect-[16/10]", "object-cover");
  });

  it("uses exact photo alt text and the alternative aspect ratio", () => {
    render(
      <RestaurantVisual
        name="다른 식당"
        category="일식"
        photoUrl="https://photos.test/alternative.jpg"
      />,
    );

    expect(
      screen.getByRole("img", { name: "다른 식당 음식 사진" }),
    ).toHaveClass("aspect-[4/3]", "object-cover");
  });
});
