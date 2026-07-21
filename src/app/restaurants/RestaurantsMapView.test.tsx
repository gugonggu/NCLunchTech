// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/kakao-map/loadKakaoMaps", () => ({
  loadKakaoMaps: vi.fn(() => new Promise(() => {})),
}));

import { RestaurantsMapView } from "./RestaurantsMapView";

describe("RestaurantsMapView", () => {
  it("reopens the hidden restaurant list at half height", async () => {
    render(
      <RestaurantsMapView
        companyLocation={null}
        restaurants={[{ id: "r1", name: "테스트 식당", category: "한식", address: null, lat: 35.1, lng: 129.1, distanceM: 100 }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "식당 목록 숨기기" }));

    const openButton = await screen.findByRole("button", { name: "식당 목록 열기" });
    expect(openButton).toHaveAttribute("aria-controls", "restaurant-results-sheet");
    expect(openButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "식당 목록 숨기기" })).toBeInTheDocument();
    });
  });
});
