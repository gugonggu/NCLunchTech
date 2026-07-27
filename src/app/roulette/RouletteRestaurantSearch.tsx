"use client";

import { useEffect, useState } from "react";
import { RESTAURANT_CATEGORIES, RADIUS_OPTIONS_M } from "@/lib/restaurants/constants";
import type { RouletteCandidate } from "@/app/recommend/RouletteResult";

type SearchItem = RouletteCandidate & {
  category: string;
  address: string;
  distanceM: number;
  isOpenNow: boolean;
};

type SearchState =
  | { status: "ready"; items: SearchItem[]; totalCount: number; page: number; totalPages: number }
  | { status: "empty" }
  | { status: "location-missing" | "error" };

const initialFilters = { q: "", category: "", radius: "800", openNow: false, sort: "distance", page: 1 };

export function RouletteRestaurantSearch({
  selectedIds,
  canAdd,
  onAddCandidate,
  onSearchCandidatesChange = () => undefined,
}: {
  selectedIds: Set<string>;
  canAdd: boolean;
  onAddCandidate: (candidate: RouletteCandidate) => void;
  onSearchCandidatesChange?: (candidates: RouletteCandidate[]) => void;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState | null>(null);
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      radius: filters.radius,
      sort: filters.sort,
      page: String(filters.page),
    });
    if (filters.q) params.set("q", filters.q);
    if (filters.category) params.set("category", filters.category);
    if (filters.openNow) params.set("openNow", "on");

    void fetch(`/api/roulette/restaurants?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("roulette_search_failed");
        return response.json() as Promise<SearchState>;
      })
      .then(setState)
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "AbortError") setState({ status: "error" });
      });

    return () => controller.abort();
  }, [filters]);

  useEffect(() => {
    if (state?.status === "ready") {
      onSearchCandidatesChange(state.items.filter((restaurant) => !excludedCategories.has(restaurant.category)));
    }
  }, [excludedCategories, onSearchCandidatesChange, state]);

  return (
    <section className="rounded-card bg-surface p-4 shadow-card" aria-label="식당 검색 및 추가">
      <h2 className="text-base font-bold text-ink">식당 검색 및 추가</h2>
      <p className="mt-1 text-sm text-ink-muted">활성 식당을 검색해 현재 룰렛 후보에 넣을 수 있어요.</p>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          setFilters((current) => ({ ...current, q: query.trim(), page: 1 }));
        }}
      >
        <label className="flex flex-col gap-1 text-sm text-ink">
          식당 이름
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-11 rounded-control border border-line px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink">
          음식 분류
          <select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value, page: 1 }))} className="min-h-11 rounded-control border border-line px-3">
            <option value="">전체</option>
            {RESTAURANT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink">
          거리
          <select value={filters.radius} onChange={(event) => setFilters((current) => ({ ...current, radius: event.target.value, page: 1 }))} className="min-h-11 rounded-control border border-line px-3">
            {RADIUS_OPTIONS_M.map((radius) => <option key={radius} value={radius}>{radius}m</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={filters.openNow} onChange={(event) => setFilters((current) => ({ ...current, openNow: event.target.checked, page: 1 }))} />
          영업 중만
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm text-ink">제외할 음식 분류</legend>
          <div className="flex flex-wrap gap-2">
            {RESTAURANT_CATEGORIES.map((category) => (
              <label key={category} className="flex items-center gap-1 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={excludedCategories.has(category)}
                  onChange={(event) => setExcludedCategories((current) => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(category); else next.delete(category);
                    return next;
                  })}
                />
                {category}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="w-full rounded-control border border-line px-3 py-2 text-sm font-semibold">검색</button>
      </form>

      <div className="mt-4 space-y-2">
        {state === null ? <p className="text-sm text-ink-muted">식당을 불러오는 중이에요.</p> : null}
        {state?.status === "ready" ? state.items.filter((restaurant) => !excludedCategories.has(restaurant.category)).map((restaurant) => {
          const alreadyAdded = selectedIds.has(restaurant.id);
          return <div key={restaurant.id} className="rounded-control bg-surface-muted p-3">
            <p className="font-semibold text-ink">{restaurant.name}</p>
            <p className="mt-1 text-xs text-ink-muted">{restaurant.category} · {restaurant.address}</p>
            <p className="mt-1 text-xs text-ink-muted">{Math.round(restaurant.distanceM)}m · {restaurant.isOpenNow ? "영업 중" : "영업 종료"}</p>
            <button type="button" disabled={!canAdd || alreadyAdded} onClick={() => onAddCandidate(restaurant)} className="mt-2 rounded-control border border-line px-3 py-1 text-sm font-semibold disabled:opacity-40">
              {alreadyAdded ? "후보에 있음" : "룰렛에 추가"}
            </button>
          </div>;
        }) : null}
        {state?.status === "empty" ? <p className="text-sm text-ink-muted">조건에 맞는 활성 식당이 없어요.</p> : null}
        {state?.status === "location-missing" ? <p className="text-sm text-error">회사 위치 정보가 없어 거리 검색을 할 수 없어요.</p> : null}
        {state?.status === "error" ? <p className="text-sm text-error">식당 검색에 실패했어요. 다시 시도해 주세요.</p> : null}
      </div>
      {!canAdd ? <p className="mt-3 text-sm font-semibold text-brand-dark">총 10칸이 모두 찼어요. 후보를 삭제하거나 칸 수를 줄인 뒤 추가해 주세요.</p> : null}
    </section>
  );
}
