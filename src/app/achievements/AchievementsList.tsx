"use client";

import { useMemo, useState } from "react";
import type { AchievementSummaryItem } from "@/lib/achievements/queries";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const CATEGORY_FILTERS: { label: string; categories: string[] }[] = [
  { label: "전체", categories: [] },
  { label: "시작", categories: ["START"] },
  { label: "방문", categories: ["VISIT"] },
  { label: "탐험", categories: ["EXPLORE"] },
  { label: "추천·월드컵", categories: ["RECOMMENDATION", "WORLDCUP"] },
  { label: "기여", categories: ["CONTRIBUTION"] },
  { label: "함께 먹기", categories: ["SOCIAL"] },
  { label: "숨겨진 업적", categories: ["HIDDEN"] },
];

export function AchievementsList({ items }: { items: AchievementSummaryItem[] }) {
  const [selectedLabel, setSelectedLabel] = useState(CATEGORY_FILTERS[0].label);

  const filteredItems = useMemo(() => {
    const selectedCategories = CATEGORY_FILTERS.find((f) => f.label === selectedLabel)?.categories ?? [];
    return selectedCategories.length === 0
      ? items
      : items.filter((item) => selectedCategories.includes(item.category));
  }, [items, selectedLabel]);

  return (
    <>
      <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1" role="tablist" aria-label="업적 종류 필터">
        {CATEGORY_FILTERS.map((filter) => {
          const isSelected = filter.label === selectedLabel;
          return (
            <button
              key={filter.label}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedLabel(filter.label)}
              className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                isSelected ? "bg-brand text-white" : "bg-surface-muted text-ink-muted"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <section className="flex flex-col gap-3" aria-label="업적 목록">
        {filteredItems.map((item) => (
          <div key={item.code} className="rounded-card bg-surface px-4 py-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">{item.name}</h2>
                <p className="mt-1 text-sm text-ink-muted">{item.description}</p>
              </div>
              {item.earned ? (
                <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-dark">
                  달성
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-ink-muted">
                  {item.pointReward}점
                </span>
              )}
            </div>

            {item.earned ? (
              <p className="mt-3 text-sm tabular-nums text-ink-muted">
                {item.earnedAt && dateFormatter.format(new Date(item.earnedAt))} 달성
                {item.titleName && (
                  <span className="ml-1 font-semibold text-brand-dark">· 칭호 &lsquo;{item.titleName}&rsquo; 해금</span>
                )}
              </p>
            ) : (
              !item.isHidden && (
                <p className="mt-3 text-sm tabular-nums text-ink-muted">
                  {item.currentValue} / {item.targetValue}
                </p>
              )
            )}
          </div>
        ))}
      </section>
    </>
  );
}
