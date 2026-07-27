// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RouletteRestaurantSearch } from "./RouletteRestaurantSearch";

afterEach(() => vi.unstubAllGlobals());

describe("RouletteRestaurantSearch", () => {
  it("adds an active restaurant returned by the filtered search", async () => {
    const onAddCandidate = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "ready",
      items: [{ id: "restaurant-1", name: "검색 식당", category: "한식", address: "서울", distanceM: 120, isOpenNow: true }],
      totalCount: 1,
      page: 1,
      totalPages: 1,
    }), { status: 200 })));

    render(<RouletteRestaurantSearch selectedIds={new Set()} canAdd onAddCandidate={onAddCandidate} />);

    fireEvent.change(screen.getByLabelText("식당 이름"), { target: { value: "검색" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    fireEvent.click(await screen.findByRole("button", { name: "룰렛에 추가" }));

    expect(onAddCandidate).toHaveBeenCalledWith({ id: "restaurant-1", name: "검색 식당", category: "한식", address: "서울", distanceM: 120, isOpenNow: true });
  });

  it("disables additions for existing candidates and a full wheel", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "ready",
      items: [{ id: "restaurant-1", name: "검색 식당", category: "한식", address: "서울", distanceM: 120, isOpenNow: true }],
      totalCount: 1,
      page: 1,
      totalPages: 1,
    }), { status: 200 })));

    render(<RouletteRestaurantSearch selectedIds={new Set(["restaurant-1"])} canAdd={false} onAddCandidate={vi.fn()} />);

    expect(await screen.findByRole("button", { name: "후보에 있음" })).toBeDisabled();
    expect(screen.getByText(/총 10칸이 모두 찼어요/)).toBeVisible();
  });
});
