"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function ResponsiveFilterPanel({
  summary,
  children,
}: {
  summary: string;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const hasBusySubmit = useCallback(
    () =>
      dialogRef.current?.querySelector(
        'button[type="submit"][aria-busy="true"], input[type="submit"][aria-busy="true"]',
      ) !== null,
    [],
  );

  const close = useCallback(() => {
    if (!hasBusySubmit()) {
      setIsOpen(false);
    }
  }, [hasBusySubmit]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [close, isOpen]);

  return (
    <div className="lg:col-start-2 lg:row-start-1">
      <div className="md:hidden">
        <button
          ref={triggerRef}
          type="button"
          className={buttonStyles({ variant: "secondary", block: true })}
          aria-label="추천 조건 열기"
          aria-expanded={isOpen}
          onClick={() => {
            restoreFocusRef.current = triggerRef.current;
            setIsOpen(true);
          }}
        >
          <span>추천 조건 열기</span>
          <span className="font-normal text-ink-muted">{summary}</span>
        </button>

        {isOpen ? (
          <div className="fixed inset-0 z-50 flex items-end bg-ink/40 px-3 pt-12">
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="recommend-filter-title"
              className="max-h-[calc(100dvh-3rem)] w-full overflow-y-auto rounded-t-card bg-surface p-5 shadow-card"
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 id="recommend-filter-title" className="text-lg font-bold text-ink">
                    추천 조건
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">{summary}</p>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  className={buttonStyles({ variant: "ghost", size: "compact" })}
                  aria-label="추천 조건 닫기"
                  onClick={close}
                >
                  닫기
                </button>
              </div>
              {children}
            </div>
          </div>
        ) : null}
      </div>

      <Card className="hidden md:block">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-ink">추천 조건</h2>
          <p className="mt-1 text-sm text-ink-muted">{summary}</p>
        </div>
        {children}
      </Card>
    </div>
  );
}
