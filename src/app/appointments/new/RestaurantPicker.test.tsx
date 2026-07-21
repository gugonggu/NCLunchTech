// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AppointmentRestaurantSearchState } from "@/lib/appointments/restaurant-search";
import { RestaurantPicker } from "./RestaurantPicker";

const filters = {
  q: "김밥",
  category: "한식",
  radius: 500,
  openNow: true,
  sort: "name" as const,
  page: 2,
};

const readyState: AppointmentRestaurantSearchState = {
  status: "ready",
  items: [
    {
      id: "r1",
      kakaoPlaceId: null,
      name: "테스트 식당",
      category: "한식",
      address: "서울시 강남구 테헤란로 1",
      distanceM: 321.8,
      isOpenNow: true,
    },
  ],
  totalCount: 21,
  page: 2,
  totalPages: 2,
  filters,
};

describe("RestaurantPicker", () => {
  it("renders current filters, a result card, and pagination that preserves filters", () => {
    render(<RestaurantPicker state={readyState} />);

    expect(screen.getByRole("textbox", { name: "식당 이름" })).toHaveValue("김밥");
    expect(screen.getByRole("combobox", { name: "음식 분류" })).toHaveValue("한식");
    expect(screen.getByRole("combobox", { name: "거리" })).toHaveValue("500");
    expect(screen.getByRole("checkbox", { name: "영업 중만" })).toBeChecked();
    expect(screen.getByRole("combobox", { name: "정렬" })).toHaveValue("name");
    expect(screen.getByRole("button", { name: "검색" })).toBeInTheDocument();
    expect(screen.getByText("총 21개 · 2/2페이지")).toBeInTheDocument();
    const restaurantLink = screen.getByRole("link", { name: /테스트 식당/ });
    expect(restaurantLink).toHaveTextContent("322m · 영업 중");
    expect(restaurantLink).toHaveAttribute(
      "href",
      "/appointments/new?restaurantId=r1",
    );
    expect(screen.getByRole("link", { name: "이전" })).toHaveAttribute(
      "href",
      "/appointments/new?q=%EA%B9%80%EB%B0%A5&category=%ED%95%9C%EC%8B%9D&radius=500&openNow=on&sort=name&page=1",
    );
    expect(screen.queryByRole("link", { name: "다음" })).not.toBeInTheDocument();
    expect(screen.getByText("다음")).toHaveAttribute("aria-disabled", "true");
  });

  it("disables previous navigation at the first page and preserves non-default filters for next navigation", () => {
    render(<RestaurantPicker state={{ ...readyState, page: 1, totalPages: 2, filters: { ...filters, page: 1 } }} />);

    expect(screen.queryByRole("link", { name: "이전" })).not.toBeInTheDocument();
    expect(screen.getByText("이전")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("link", { name: "다음" })).toHaveAttribute(
      "href",
      "/appointments/new?q=%EA%B9%80%EB%B0%A5&category=%ED%95%9C%EC%8B%9D&radius=500&openNow=on&sort=name&page=2",
    );
  });

  it("renders a resettable empty state", () => {
    render(<RestaurantPicker state={{ status: "empty", filters }} />);

    expect(screen.getByText("조건에 맞는 식당이 없어요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "조건 초기화" })).toHaveAttribute("href", "/appointments/new");
  });

  it("renders location-missing and retryable error feedback", () => {
    const { rerender } = render(<RestaurantPicker state={{ status: "location-missing", filters }} />);

    expect(screen.getByRole("alert")).toHaveTextContent("회사 위치 정보가 없어요");
    expect(screen.getByRole("link", { name: "다시 시도" })).toHaveAttribute("href", "/appointments/new");

    rerender(<RestaurantPicker state={{ status: "error", filters }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("식당을 불러오지 못했어요");
    expect(screen.getByRole("link", { name: "다시 시도" })).toHaveAttribute("href", "/appointments/new");
  });
});
