"use client";

import { useState, type ReactNode } from "react";

const STORAGE_PREFIX = "me:collapsed:";

function readStoredCollapsed(storageKey: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(STORAGE_PREFIX + storageKey) === "true";
}

/** 접기 상태를 브라우저 localStorage에 기억한다(기기별, 서버에는 저장하지 않음). */
export function CollapsibleSection({
  storageKey,
  ariaLabel,
  title,
  description,
  statusMessage,
  children,
}: {
  storageKey: string;
  ariaLabel: string;
  title: string;
  description: string;
  statusMessage?: string | null;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(() => readStoredCollapsed(storageKey));

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_PREFIX + storageKey, String(next));
      return next;
    });
  }

  return (
    <section className="rounded-card bg-surface px-4 py-4 shadow-card" aria-label={ariaLabel}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div>
          <h2 className="text-base font-bold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {statusMessage && (
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-dark">
              {statusMessage}
            </span>
          )}
          <span aria-hidden="true" className="text-ink-muted">
            {collapsed ? "▸" : "▾"}
          </span>
        </div>
      </button>
      {!collapsed && <div className="mt-4">{children}</div>}
    </section>
  );
}
