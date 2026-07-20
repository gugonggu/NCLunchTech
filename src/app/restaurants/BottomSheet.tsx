"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

export type SheetSnap = "peek" | "half" | "full";

const SNAP_ORDER: SheetSnap[] = ["peek", "half", "full"];

const HEIGHT_CLASSES: Record<SheetSnap, string> = {
  peek: "h-24",
  half: "h-[45vh]",
  full: "h-[85vh]",
};

const DRAG_TAP_THRESHOLD_PX = 30;

/**
 * 지도 위에 겹쳐지는 바텀시트. 손잡이를 위/아래로 드래그하거나 탭하면 peek/half/full
 * 세 단계를 오간다. 실제 높이 추적 없이 드래그 방향+임계값만으로 다음 단계를 정하는
 * 단순화된 스냅 방식이라, 손가락을 따라 실시간으로 늘어나는 느낌은 없다(드래그를 놓는
 * 순간 한 단계 펼쳐지거나 접힘).
 */
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

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    dragStartY.current = e.clientY;
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) {
      return;
    }
    const deltaY = dragStartY.current - e.clientY; // 양수: 위로 드래그(펼치기)
    dragStartY.current = null;

    const currentIndex = SNAP_ORDER.indexOf(snap);

    if (Math.abs(deltaY) < DRAG_TAP_THRESHOLD_PX) {
      // 드래그라고 보기엔 너무 작은 움직임 → 탭으로 간주해 다음 단계로 순환
      onSnapChange(SNAP_ORDER[(currentIndex + 1) % SNAP_ORDER.length]);
      return;
    }

    if (deltaY > 0 && currentIndex < SNAP_ORDER.length - 1) {
      onSnapChange(SNAP_ORDER[currentIndex + 1]);
    } else if (deltaY < 0 && currentIndex > 0) {
      onSnapChange(SNAP_ORDER[currentIndex - 1]);
    }
  }

  function handlePointerCancel() {
    dragStartY.current = null;
  }

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-3xl bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.12)] transition-[height] duration-300 ease-out ${HEIGHT_CLASSES[snap]}`}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="flex shrink-0 cursor-grab touch-none flex-col items-center gap-2 py-2 active:cursor-grabbing"
      >
        <span aria-hidden className="h-1 w-10 rounded-full bg-neutral-300" />
        {header}
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
    </div>
  );
}
