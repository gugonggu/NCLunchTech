import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ search: vi.fn() }));

vi.mock("@/lib/roulette/restaurant-search", () => ({
  searchRouletteRestaurants: mocks.search,
}));

import { GET } from "./route";

it("forwards URL search filters and returns the search state as JSON", async () => {
  const state = { status: "empty", filters: { q: "국밥" } };
  mocks.search.mockResolvedValue(state);

  const response = await GET(new Request("http://localhost/api/roulette/restaurants?q=%EA%B5%AD%EB%B0%A5&openNow=on"));

  expect(mocks.search).toHaveBeenCalledWith({ q: "국밥", openNow: "on" });
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual(state);
});
