// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RouletteResult } from "./RouletteResult";

describe("RouletteResult", () => {
  it("keeps the selected restaurant on the visible wheel when candidates exceed eight", () => {
    render(<RouletteResult candidates={["1", "2", "3", "4", "5", "6", "7", "8", "당첨"]} restaurantId="restaurant-9" restaurantName="당첨" decideAction={vi.fn()} rerollAction={vi.fn()} />);

    expect(screen.getByTestId("roulette-wheel")).toHaveTextContent("당첨");
  });

  it("reveals the selected restaurant and result actions after spinning", async () => {
    vi.useFakeTimers();
    render(<RouletteResult candidates={["한식당", "중식당"]} restaurantId="restaurant-2" restaurantName="중식당" decideAction={vi.fn()} rerollAction={vi.fn()} />);

    expect(screen.getByTestId("roulette-wheel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "룰렛 돌리기" }));
    expect(screen.getByTestId("roulette-wheel")).toHaveStyle({ transform: "rotate(1800deg)" });
    act(() => vi.advanceTimersByTime(1200));

    expect(screen.getAllByText("중식당")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "같이 먹기" })).toHaveAttribute("href", "/appointments/new?restaurantId=restaurant-2");
    expect(screen.getByRole("link", { name: "투표로 넘기기" })).toHaveAttribute("href", "/polls/new?type=restaurant&selectedRestaurantId=restaurant-2");
    vi.useRealTimers();
  });
});
