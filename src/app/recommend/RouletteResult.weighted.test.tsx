// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RouletteResult } from "./RouletteResult";

const candidates = [
  { id: "a", name: "A" },
  { id: "b", name: "B" },
  { id: "c", name: "C" },
];

describe("RouletteResult weighted candidates", () => {
  it("limits the initial candidate list to 64 slots", () => {
    const manyCandidates = Array.from({ length: 65 }, (_, index) => ({ id: String(index), name: `Candidate ${index}` }));
    render(<RouletteResult candidates={manyCandidates} initialWinnerId="64" decideAction={vi.fn()} />);

    expect(screen.getByText("총 64칸 · 후보 64곳")).toBeInTheDocument();
    expect(screen.getByTestId("roulette-wheel")).toHaveTextContent("Candidate 64");
  });

  it("edits candidate slots and rebuilds the current source list", () => {
    render(<RouletteResult candidates={candidates} initialWinnerId="a" decideAction={vi.fn()} />);

    expect(screen.getByText("총 3칸 · 후보 3곳")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "B 칸 늘리기" }));
    expect(screen.getByText("B · 2칸 (50.0%)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "C 후보 삭제" }));
    expect(screen.queryByText(/C ·/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "추가할 식당" }), { target: { value: "c" } });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));
    expect(screen.getByText("C · 1칸 (25.0%)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "목록 재구성하기" }));

    expect(screen.getByText("총 3칸 · 후보 3곳")).toBeInTheDocument();
    expect(screen.getByText("B · 1칸 (33.3%)")).toBeInTheDocument();
  });
});
