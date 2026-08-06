// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FridayPizzaPartyCard } from "./FridayPizzaPartyCard";

describe("FridayPizzaPartyCard", () => {
  it("starts a preselected public pickup appointment", () => {
    render(<FridayPizzaPartyCard restaurantId="pizza-1" />);

    expect(screen.getByRole("heading", { name: "🍕 금요일 피자 파티" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "포장 약속 만들기" })).toHaveAttribute(
      "href",
      "/appointments/new?restaurantId=pizza-1&promo=friday-pizza-party",
    );
  });
});
