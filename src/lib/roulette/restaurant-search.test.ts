import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  normalize: vi.fn(),
  search: vi.fn(),
}));

vi.mock("@/lib/appointments/restaurant-search", () => ({
  normalizeAppointmentRestaurantSearch: mocks.normalize,
  searchAppointmentRestaurants: mocks.search,
}));

import {
  normalizeRouletteRestaurantSearch,
  searchAllRouletteRestaurants,
  searchRouletteRestaurants,
} from "./restaurant-search";

describe("roulette restaurant search", () => {
  it("uses the shared active-restaurant filter normalization", () => {
    const raw = { q: "국밥", openNow: "on" };
    const normalized = { q: "국밥", category: "", radius: 800, openNow: true, sort: "distance" as const, page: 1 };
    mocks.normalize.mockReturnValue(normalized);

    expect(normalizeRouletteRestaurantSearch(raw)).toBe(normalized);
    expect(mocks.normalize).toHaveBeenCalledWith(raw);
  });

  it("searches through the existing active-restaurant RPC boundary", async () => {
    const raw = { q: "국밥", page: "2" };
    const state = { status: "empty" as const, filters: { q: "국밥" } };
    mocks.search.mockResolvedValue(state);

    await expect(searchRouletteRestaurants(raw)).resolves.toBe(state);
    expect(mocks.search).toHaveBeenCalledWith(raw);
  });

  it("collects every page for randomized roulette rebuilding", async () => {
    mocks.search.mockClear();
    mocks.search
      .mockResolvedValueOnce({
        status: "ready",
        items: [{ id: "1" }],
        totalCount: 21,
        page: 1,
        totalPages: 2,
        filters: {},
      })
      .mockResolvedValueOnce({
        status: "ready",
        items: [{ id: "2" }],
        totalCount: 21,
        page: 2,
        totalPages: 2,
        filters: {},
      });

    await expect(searchAllRouletteRestaurants({ q: "국밥" })).resolves.toEqual([
      { id: "1" },
      { id: "2" },
    ]);
    expect(mocks.search).toHaveBeenNthCalledWith(1, { q: "국밥", page: "1" });
    expect(mocks.search).toHaveBeenNthCalledWith(2, { q: "국밥", page: "2" });
  });
});
