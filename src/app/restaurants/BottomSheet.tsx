"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";

export type SheetSnap = "hidden" | "peek" | "half" | "full";

const SNAP_ORDER: SheetSnap[] = ["hidden", "peek", "half", "full"];

const HEIGHT_CLASSES: Record<Exclude<SheetSnap, "hidden">, string> = {
  peek: "h-24",
  half: "h-[45%]",
  full: "h-[85%]",
};

const DRAG_TAP_THRESHOLD_PX = 30;
const MIN_DRAG_HEIGHT_PX = 64;

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
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartHeightPx = useRef(0);
  const handledPointerAction = useRef(false);
  const [dragHeightPx, setDragHeightPx] = useState<number | null>(null);

  function moveToAdjacentSnap(direction: 1 | -1) {
    const currentIndex = SNAP_ORDER.indexOf(snap);
    const nextIndex = Math.max(0, Math.min(currentIndex + direction, SNAP_ORDER.length - 1));
    onSnapChange(SNAP_ORDER[nextIndex]);
  }

  function handlePointerDown(e: PointerEvent<HTMLButtonElement>) {
    // setPointerCapture가 없으면 손가락/마우스가 이 작은 핸들 밖으로 벗어나는 순간
    // pointerup이 이 요소에서 발생하지 않아 드래그가 끊긴다(실기기 드래그 불가 버그의 원인).
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragStartY.current = e.clientY;
    dragStartHeightPx.current = sheetRef.current?.getBoundingClientRect().height ?? 0;
    handledPointerAction.current = false;
    setDragHeightPx(null);
  }

  function handlePointerMove(e: PointerEvent<HTMLButtonElement>) {
    if (dragStartY.current === null) {
      return;
    }
    // 시트는 bottom-0으로 바닥에 붙어 있으니, 위치를 옮기는 대신(translateY) 높이 자체를
    // 늘리고 줄여야 바닥 쪽에 빈 공간이 생기지 않는다.
    const deltaY = dragStartY.current - e.clientY;
    const maxHeightPx = sheetRef.current?.parentElement?.clientHeight ?? window.innerHeight;
    const nextHeightPx = Math.max(MIN_DRAG_HEIGHT_PX, Math.min(maxHeightPx, dragStartHeightPx.current + deltaY));
    setDragHeightPx(nextHeightPx);
  }

  function handlePointerUp(e: PointerEvent<HTMLButtonElement>) {
    if (dragStartY.current === null) {
      return;
    }

    const deltaY = dragStartY.current - e.clientY;
    dragStartY.current = null;
    handledPointerAction.current = true;
    setDragHeightPx(null);

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
    setDragHeightPx(null);
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
      ref={sheetRef}
      id="restaurant-results-sheet"
      role="region"
      aria-label="식당 목록"
      className={`absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-card bg-surface shadow-[0_-4px_16px_rgba(0,0,0,0.12)] ${
        dragHeightPx === null ? `transition-[height] duration-300 ease-out ${HEIGHT_CLASSES[snap]}` : ""
      }`}
      style={dragHeightPx !== null ? { height: `${dragHeightPx}px` } : undefined}
    >
      <button
        type="button"
        aria-label="식당 목록 높이 조절"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={handleClick}
        className="flex min-h-11 w-full shrink-0 cursor-grab touch-none flex-col items-center justify-center py-2 active:cursor-grabbing"
      >
        <span aria-hidden className="h-1 w-10 rounded-full bg-line" />
      </button>
      <div className="shrink-0 px-4 pb-2 text-center">{header}</div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
    </div>
  );
}
