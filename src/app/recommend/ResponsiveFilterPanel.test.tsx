// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RecommendationFilters } from "./RecommendationFilters";
import { ResponsiveFilterPanel } from "./ResponsiveFilterPanel";

afterEach(() => {
  document.body.style.overflow = "";
});

function renderPanel({ busy = false }: { busy?: boolean } = {}) {
  return render(
    <ResponsiveFilterPanel summary="한식 · 800m">
      <form>
        <label htmlFor="radius">거리</label>
        <select id="radius" />
        <button type="submit" aria-busy={busy ? "true" : undefined}>
          적용
        </button>
      </form>
    </ResponsiveFilterPanel>,
  );
}

describe("ResponsiveFilterPanel", () => {
  it("opens with close-button focus and locks background scrolling", () => {
    document.body.style.overflow = "clip";
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "추천 조건 열기" }));

    expect(screen.getByRole("dialog", { name: "추천 조건" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "추천 조건 닫기" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("closes with Escape, restores scrolling, and returns focus", () => {
    document.body.style.overflow = "clip";
    renderPanel();
    const trigger = screen.getByRole("button", { name: "추천 조건 열기" });

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "추천 조건" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("clip");
    expect(trigger).toHaveFocus();
  });

  it("does not close while a descendant submit is busy", () => {
    renderPanel({ busy: true });
    const trigger = screen.getByRole("button", { name: "추천 조건 열기" });

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("dialog", { name: "추천 조건" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "추천 조건 닫기" }));
    expect(screen.getByRole("dialog", { name: "추천 조건" })).toBeInTheDocument();
    expect(trigger).not.toHaveFocus();
  });
});

describe("RecommendationFilters", () => {
  it("preserves GET field names, current values, and menu-data disabled rules", () => {
    const { container } = render(
      <RecommendationFilters
        conditions={{
          restaurantName: "김밥",
          menuName: "참치",
          category: "한식",
          maxPriceWon: 12000,
          excludeRecentVisits: true,
          excludeCongested: true,
          preferFavorites: true,
          preferGoodRating: true,
          preferFast: true,
          preferUnvisited: true,
        }}
        radius={800}
        hasMenuData={false}
      />,
    );

    const expectedNames = [
      "q",
      "menuQ",
      "category",
      "radius",
      "maxPrice",
      "excludeRecent",
      "excludeCongested",
      "preferFavorites",
      "preferGoodRating",
      "preferFast",
      "preferUnvisited",
    ];
    expect(
      Array.from(container.querySelectorAll("[name]")).map((field) => field.getAttribute("name")),
    ).toEqual(expectedNames);

    expect(screen.getByRole("textbox", { name: "식당 이름" })).toHaveValue("김밥");
    expect(screen.getByRole("textbox", { name: "메뉴 이름" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "음식 분류" })).toHaveValue("한식");
    expect(screen.getByRole("combobox", { name: "거리" })).toHaveValue("800");
    expect(screen.getByRole("spinbutton", { name: "희망 가격" })).toBeDisabled();
    expect(screen.getAllByText("등록된 메뉴·가격 정보가 없어 현재 사용할 수 없습니다.")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "이 조건으로 추천받기" })).toBeInTheDocument();
  });

  it("keeps menu and price fields available when menu data exists", () => {
    render(<RecommendationFilters conditions={{}} radius={1200} hasMenuData />);

    expect(screen.getByRole("textbox", { name: "메뉴 이름" })).toBeEnabled();
    expect(screen.getByRole("spinbutton", { name: "희망 가격" })).toBeEnabled();
    expect(screen.getByRole("combobox", { name: "거리" })).toHaveValue("1200");
  });
});
