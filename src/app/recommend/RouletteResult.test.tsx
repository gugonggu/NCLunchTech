// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RouletteResult } from "./RouletteResult";

describe("RouletteResult", () => {
  it("keeps every candidate visible on the weighted wheel", () => {
    render(<RouletteResult candidates={[{ id: "a", name: "A" }, { id: "b", name: "B" }]} initialWinnerId="b" decideAction={vi.fn()} />);
    expect(screen.getByTestId("roulette-wheel")).toHaveTextContent("A");
    expect(screen.getByTestId("roulette-wheel")).toHaveTextContent("B");
  });

  it("places each label on its sector midpoint measured from the 12 o'clock pointer", () => {
    render(<RouletteResult candidates={[{ id: "a", name: "A" }, { id: "b", name: "B" }]} initialWinnerId="a" decideAction={vi.fn()} />);

    expect(screen.getByTestId("roulette-label-a")).toHaveStyle({ transform: "rotate(90deg) translateY(-76px) rotate(-90deg)" });
  });
});
