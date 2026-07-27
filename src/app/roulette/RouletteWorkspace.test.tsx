// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RouletteWorkspace } from "./RouletteWorkspace";

vi.mock("./RouletteRestaurantSearch", () => ({
  RouletteRestaurantSearch: ({ canAdd, onAddCandidate }: { canAdd: boolean; onAddCandidate: (candidate: { id: string; name: string }) => void }) => (
    <button type="button" disabled={!canAdd} onClick={() => onAddCandidate({ id: "searched", name: "검색 식당" })}>
      검색 식당 추가
    </button>
  ),
}));

describe("RouletteWorkspace", () => {
  it("adds a searched restaurant without clearing current roulette entries", () => {
    render(<RouletteWorkspace initialCandidates={[{ id: "existing", name: "기존 식당" }]} decideAction={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "검색 식당 추가" }));

    expect(screen.getAllByText(/기존 식당/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/검색 식당/).length).toBeGreaterThan(0);
  });

  it("disables search additions when the wheel already has 64 slots", () => {
    const candidates = Array.from({ length: 64 }, (_, index) => ({ id: String(index), name: `식당 ${index}` }));

    render(<RouletteWorkspace initialCandidates={candidates} decideAction={vi.fn()} />);

    expect(screen.getByRole("button", { name: "검색 식당 추가" })).toBeDisabled();
  });
});
