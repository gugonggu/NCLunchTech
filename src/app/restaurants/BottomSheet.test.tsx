// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BottomSheet, type SheetSnap } from "./BottomSheet";

function renderSheet(snap: SheetSnap) {
  const onSnapChange = vi.fn();
  render(
    <BottomSheet snap={snap} onSnapChange={onSnapChange} header={<p>결과</p>}>
      <p>식당 결과</p>
    </BottomSheet>,
  );
  return onSnapChange;
}

function drag(handle: HTMLElement, startY: number, endY: number) {
  fireEvent.pointerDown(handle, { clientY: startY });
  fireEvent.pointerUp(handle, { clientY: endY });
}

describe("BottomSheet", () => {
  it.each([
    ["peek", "half"],
    ["half", "full"],
    ["full", "full"],
  ] as const)("moves upward from %s to %s", (snap, expected) => {
    const onSnapChange = renderSheet(snap);

    drag(screen.getByRole("button", { name: "식당 목록 높이 조절" }), 160, 100);

    expect(onSnapChange).toHaveBeenCalledWith(expected);
  });

  it("does not advance twice when a drag is followed by its click event", () => {
    const onSnapChange = renderSheet("peek");
    const handle = screen.getByRole("button", { name: "식당 목록 높이 조절" });

    drag(handle, 160, 100);
    fireEvent.click(handle);

    expect(onSnapChange).toHaveBeenCalledOnce();
    expect(onSnapChange).toHaveBeenCalledWith("half");
  });

  it.each([
    ["full", "half"],
    ["half", "peek"],
    ["peek", "hidden"],
  ] as const)("moves downward from %s to %s", (snap, expected) => {
    const onSnapChange = renderSheet(snap);

    drag(screen.getByRole("button", { name: "식당 목록 높이 조절" }), 100, 160);

    expect(onSnapChange).toHaveBeenCalledWith(expected);
  });

  it.each([
    ["peek", "half"],
    ["half", "full"],
    ["full", "full"],
  ] as const)("advances one visible step when tapped from %s", (snap, expected) => {
    const onSnapChange = renderSheet(snap);

    fireEvent.click(screen.getByRole("button", { name: "식당 목록 높이 조절" }));

    expect(onSnapChange).toHaveBeenCalledWith(expected);
  });

  it("always hides from the explicit hide button", () => {
    const onSnapChange = renderSheet("half");

    const hideButton = screen.getByRole("button", { name: "식당 목록 숨기기" });
    fireEvent.click(hideButton);

    expect(onSnapChange).toHaveBeenCalledWith("hidden");
    expect(hideButton).toHaveAttribute("aria-controls", "restaurant-results-sheet");
    expect(hideButton).toHaveAttribute("aria-expanded", "true");
  });

  it("renders no sheet while hidden", () => {
    renderSheet("hidden");

    expect(screen.queryByRole("button", { name: "식당 목록 높이 조절" })).not.toBeInTheDocument();
    expect(document.getElementById("restaurant-results-sheet")).toBeNull();
  });
});
