// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RouletteResult } from "./RouletteResult";

describe("RouletteResult", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps every candidate visible on the weighted wheel", () => {
    render(<RouletteResult candidates={[{ id: "a", name: "A" }, { id: "b", name: "B" }]} initialWinnerId="b" decideAction={vi.fn()} />);
    expect(screen.getByTestId("roulette-wheel")).toHaveTextContent("A");
    expect(screen.getByTestId("roulette-wheel")).toHaveTextContent("B");
  });

  it("places each label on its sector midpoint measured from the 12 o'clock pointer", () => {
    render(<RouletteResult candidates={[{ id: "a", name: "A" }, { id: "b", name: "B" }]} initialWinnerId="a" decideAction={vi.fn()} />);

    expect(screen.getByTestId("roulette-label-a")).toHaveStyle({ transform: "rotate(90deg) translateY(-76px) rotate(-90deg)" });
  });

  it("shows the Kakao Map place link for the winning restaurant", () => {
    vi.useFakeTimers();
    render(
      <RouletteResult
        candidates={[{ id: "a", name: "카카오 식당", kakaoPlaceId: "123456" }]}
        initialWinnerId="a"
        decideAction={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "룰렛 돌리기" }));
    act(() => vi.advanceTimersByTime(1200));

    expect(screen.getByRole("link", { name: "카카오맵에서 보기" })).toHaveAttribute(
      "href",
      "https://place.map.kakao.com/123456",
    );
  });
});
