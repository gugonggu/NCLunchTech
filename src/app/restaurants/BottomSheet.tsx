"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

export type SheetSnap = "hidden" | "peek" | "half" | "full";

const SNAP_ORDER: SheetSnap[] = ["hidden", "peek", "half", "full"];

const HEIGHT_CLASSES: Record<Exclude<SheetSnap, "hidden">, string> = {
  peek: "h-24",
  half: "h-[45%]",
  full: "h-[85%]",
};

const DRAG_TAP_THRESHOLD_PX = 30;

export function BottomSheet({
  snap,
  onSnapChange,
  header,
  children,
}: {
  snap: SheetSnap;
  onSnapChange: (next: SheetSnap) => void;
  header?: ReactNode;
  children: ReactNode;
}) {
  const dragStartY = useRef<number | null>(null);
  const handledPointerAction = useRef(false);

  function moveToAdjacentSnap(direction: 1 | -1) {
    const currentIndex = SNAP_ORDER.indexOf(snap);
    const nextIndex = Math.max(0, Math.min(currentIndex + direction, SNAP_ORDER.length - 1));
    onSnapChange(SNAP_ORDER[nextIndex]);
  }

  function handlePointerDown(e: PointerEvent<HTMLButtonElement>) {
    dragStartY.current = e.clientY;
    handledPointerAction.current = false;
  }

  function handlePointerUp(e: PointerEvent<HTMLButtonElement>) {
    if (dragStartY.current === null) {
      return;
    }

    const deltaY = dragStartY.current - e.clientY;
    dragStartY.current = null;
    handledPointerAction.current = true;

    if (Math.abs(deltaY) < DRAG_TAP_THRESHOLD_PX) {
      moveToAdjacentSnap(1);
      return;
    }

    if (deltaY > 0) {
      moveToAdjacentSnap(1);
    } else {
      moveToAdjacentSnap(-1);
    }
  }

  function handlePointerCancel() {
    dragStartY.current = null;
    handledPointerAction.current = false;
  }

  function handleClick() {
    if (handledPointerAction.current) {
      handledPointerAction.current = false;
      return;
    }

    moveToAdjacentSnap(1);
  }

  if (snap === "hidden") {
    return null;
  }

  return (
    <div
      id="restaurant-results-sheet"
      role="region"
      aria-label="식당 목록"
      className={`absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-3xl bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.12)] transition-[height] duration-300 ease-out ${HEIGHT_CLASSES[snap]}`}
    >
      <div className="flex shrink-0 items-center px-2 py-2">
        <button
          type="button"
          aria-label="식당 목록 높이 조절"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onClick={handleClick}
          className="flex min-h-11 min-w-11 flex-1 cursor-grab touch-none flex-col items-center justify-center active:cursor-grabbing"
        >
          <span aria-hidden className="h-1 w-10 rounded-full bg-neutral-300" />
        </button>
        <button
          type="button"
          onClick={() => onSnapChange("hidden")}
          aria-controls="restaurant-results-sheet"
          aria-expanded="true"
          aria-label="식당 목록 숨기기"
          className="min-h-11 min-w-11 text-sm text-neutral-500"
        >
          숨기기
        </button>
      </div>
      <div className="shrink-0 px-4 pb-2 text-center">{header}</div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
    </div>
  );
}
