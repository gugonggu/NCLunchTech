// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RESTAURANT_CATEGORIES } from "@/lib/restaurants/constants";
import { RecommendationFilters } from "./RecommendationFilters";

describe("RecommendationFilters excluded categories", () => {
  it("renders one checked field for each selected excluded category", () => {
    const selected = [RESTAURANT_CATEGORIES[0], RESTAURANT_CATEGORIES[2]];
    const { container } = render(
      <RecommendationFilters conditions={{ excludedCategories: selected }} radius={800} hasMenuData />,
    );

    const fields = Array.from(container.querySelectorAll<HTMLInputElement>('input[name="excludeCategory"]'));
    expect(fields).toHaveLength(RESTAURANT_CATEGORIES.length);
    expect(fields.filter((field) => field.checked).map((field) => field.value)).toEqual(selected);
  });
});
