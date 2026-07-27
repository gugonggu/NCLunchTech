import { describe, expect, it, vi } from "vitest";
import { RESTAURANT_CATEGORIES } from "@/lib/restaurants/constants";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  getCurrentEmployee: vi.fn().mockResolvedValue({ id: "employee-1" }),
  getExclusionList: vi.fn().mockResolvedValue([]),
  setExclusionList: vi.fn().mockResolvedValue(undefined),
  addExclusion: vi.fn((items: string[]) => items),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth/session", () => ({ getCurrentEmployee: mocks.getCurrentEmployee }));
vi.mock("@/lib/recommend/exclusion-cookie", () => ({
  getExclusionList: mocks.getExclusionList,
  setExclusionList: mocks.setExclusionList,
  addExclusion: mocks.addExclusion,
  UUID_PATTERN: /^[0-9a-f-]{36}$/i,
}));

import { rerollRecommendation } from "./actions";

describe("rerollRecommendation", () => {
  it("preserves excluded categories in its redirect URL", async () => {
    await rerollRecommendation("not-a-uuid", {
      excludedCategories: [RESTAURANT_CATEGORIES[0], RESTAURANT_CATEGORIES[1]],
    });

    expect(new URL(mocks.redirect.mock.calls[0][0], "https://example.com").searchParams.getAll("excludeCategory")).toEqual(
      [RESTAURANT_CATEGORIES[0], RESTAURANT_CATEGORIES[1]],
    );
  });
});
