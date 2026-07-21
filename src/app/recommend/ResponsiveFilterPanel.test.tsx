// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecommendationFilters } from "./RecommendationFilters";
import { ResponsiveFilterPanel } from "./ResponsiveFilterPanel";

const mediaListeners = new Set<(event: MediaQueryListEvent) => void>();

beforeEach(() => {
  mediaListeners.clear();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        mediaListeners.add(listener);
      },
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        mediaListeners.delete(listener);
      },
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  document.body.style.overflow = "";
});

function panel({ busy = false }: { busy?: boolean } = {}) {
  return (
    <ResponsiveFilterPanel summary="한식 · 800m">
      <form>
        <label htmlFor="radius">거리</label>
        <select id="radius" />
        <button type="submit" aria-busy={busy ? "true" : undefined}>
          적용
        </button>
      </form>
    </ResponsiveFilterPanel>
  );
}

function renderPanel(options: { busy?: boolean } = {}) {
  return render(panel(options));
}

function emitDesktopBreakpoint() {
  act(() => {
    for (const listener of mediaListeners) {
      listener({ matches: true } as MediaQueryListEvent);
    }
  });
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
    fireEvent.click(screen.getByRole("button", { name: "추천 조건 배경 닫기" }));
    expect(screen.getByRole("dialog", { name: "추천 조건" })).toBeInTheDocument();
    expect(trigger).not.toHaveFocus();
  });

  it("traps Tab and Shift+Tab at both modal focus edges", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "추천 조건 열기" }));

    const dialog = screen.getByRole("dialog", { name: "추천 조건" });
    const closeButton = within(dialog).getByRole("button", { name: "추천 조건 닫기" });
    const submitButton = within(dialog).getByRole("button", { name: "적용" });

    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(submitButton).toHaveFocus();

    submitButton.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeButton).toHaveFocus();
  });

  it("closes and restores page state when the viewport reaches md", () => {
    document.body.style.overflow = "clip";
    renderPanel();
    const trigger = screen.getByRole("button", { name: "추천 조건 열기" });
    fireEvent.click(trigger);

    expect(mediaListeners.size).toBeGreaterThan(0);
    emitDesktopBreakpoint();

    expect(screen.queryByRole("dialog", { name: "추천 조건" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("clip");
    expect(trigger).toHaveFocus();
  });

  it("keeps a busy navigation form mounted across md and closes when pending clears", async () => {
    document.body.style.overflow = "clip";
    const view = renderPanel({ busy: true });
    const trigger = screen.getByRole("button", { name: "추천 조건 열기" });
    fireEvent.click(trigger);

    emitDesktopBreakpoint();
    expect(screen.getByRole("dialog", { name: "추천 조건" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "적용" })).toHaveAttribute("aria-busy", "true");
    expect(document.body.style.overflow).toBe("hidden");

    view.rerender(panel({ busy: false }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "추천 조건" })).not.toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe("clip");
    expect(trigger).toHaveFocus();
  });

  it("renders one namespaced filter form with correctly associated labels", () => {
    const { container } = render(
      <ResponsiveFilterPanel summary="전체 음식 · 800m">
        <RecommendationFilters
          idPrefix="recommend-filter"
          conditions={{}}
          radius={800}
          hasMenuData
        />
      </ResponsiveFilterPanel>,
    );

    expect(container.querySelectorAll("form")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "추천 조건 열기" }));
    expect(container.querySelectorAll("form")).toHaveLength(1);

    const dialog = screen.getByRole("dialog", { name: "추천 조건" });
    const labeledControls = [
      ["식당 이름", "restaurant-name"],
      ["메뉴 이름", "menu-name"],
      ["음식 분류", "category"],
      ["거리", "radius"],
      ["희망 가격", "max-price"],
    ] as const;

    for (const [label, suffix] of labeledControls) {
      const control = within(dialog).getByLabelText(label);
      expect(control).toHaveAttribute("id", `recommend-filter-${suffix}`);
      expect(dialog.querySelector(`label[for="recommend-filter-${suffix}"]`)).not.toBeNull();
    }
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
