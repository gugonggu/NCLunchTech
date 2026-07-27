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
});
