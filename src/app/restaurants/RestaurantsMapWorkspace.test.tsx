// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RestaurantsMapWorkspace } from "./RestaurantsMapWorkspace";

describe("RestaurantsMapWorkspace", () => {
  it("keeps the search header outside the map workspace", () => {
    render(
      <RestaurantsMapWorkspace header={<div>검색 영역</div>}>
        <div>지도 영역</div>
      </RestaurantsMapWorkspace>,
    );

    const header = screen.getByText("검색 영역");
    const map = screen.getByText("지도 영역").parentElement;

    expect(header.parentElement).toHaveClass("shrink-0");
    expect(map).toHaveClass("relative", "min-h-0", "flex-1");
    expect(map).not.toContainElement(header);
  });
});
