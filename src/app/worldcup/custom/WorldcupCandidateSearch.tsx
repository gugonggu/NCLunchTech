"use client";

import { useEffect, useState } from "react";
import { RESTAURANT_CATEGORIES } from "@/lib/restaurants/constants";
import type { WorldcupCandidate } from "@/lib/worldcup/candidates";
import type { WorldcupGameType } from "@/lib/worldcup/validation";

type SearchState =
  | { status: "ready"; items: WorldcupCandidate[]; totalCount: number; page: number; totalPages: number }
  | { status: "empty" }
  | { status: "error" };

interface RestaurantSearchItem {
  id: string;
  name: string;
  category: string;
  distanceM: number;
}

function toWorldcupCandidate(item: RestaurantSearchItem): WorldcupCandidate {
  return {
    menuKey: item.id,
    name: item.name,
    categoryId: item.category,
    restaurantIds: [item.id],
    distanceM: item.distanceM,
  };
}

export function WorldcupCandidateSearch({
  gameType,
  selectedKeys,
  canAdd,
  onAddCandidate,
}: {
  gameType: WorldcupGameType;
  selectedKeys: Set<string>;
  canAdd: boolean;
  onAddCandidate: (candidate: WorldcupCandidate) => void;
}) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [state, setState] = useState<SearchState | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const endpoint = gameType === "MENU" ? "/api/worldcup/menus" : "/api/roulette/restaurants";
    const params = new URLSearchParams({ page: String(page) });
    if (submittedQuery) params.set("q", submittedQuery);
    if (category) params.set("category", category);

    void fetch(`${endpoint}?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("worldcup_candidate_search_failed");
        return response.json();
      })
      .then((result: { status: string; items?: unknown[]; totalCount?: number; page?: number; totalPages?: number }) => {
        if (result.status !== "ready") {
          setState({ status: result.status as "empty" });
          return;
        }
        const items =
          gameType === "MENU"
            ? (result.items as WorldcupCandidate[])
            : (result.items as RestaurantSearchItem[]).map(toWorldcupCandidate);

        setState({
          status: "ready",
          items,
          totalCount: result.totalCount ?? items.length,
          page: result.page ?? 1,
          totalPages: result.totalPages ?? 1,
        });
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "AbortError") setState({ status: "error" });
      });

    return () => controller.abort();
  }, [gameType, submittedQuery, category, page]);

  return (
    <section className="rounded-card bg-surface p-4 shadow-card" aria-label="후보 검색 및 담기">
      <h2 className="text-base font-bold text-ink">{gameType === "MENU" ? "메뉴 검색" : "식당 검색"}</h2>
      <p className="mt-1 text-sm text-ink-muted">
        {gameType === "MENU"
          ? "메뉴 이름으로 검색해 월드컵 후보에 담아보세요."
          : "식당 이름으로 검색해 월드컵 후보에 담아보세요."}
      </p>
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSubmittedQuery(query.trim());
        }}
      >
        <label className="flex flex-col gap-1 text-sm text-ink">
          {gameType === "MENU" ? "메뉴 이름" : "식당 이름"}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-11 rounded-control border border-line px-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink">
          음식 분류
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
            className="min-h-11 rounded-control border border-line px-3"
          >
            <option value="">전체</option>
            {RESTAURANT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="w-full rounded-control border border-line px-3 py-2 text-sm font-semibold">
          검색
        </button>
      </form>

      <div className="mt-4 space-y-2">
        {state === null ? <p className="text-sm text-ink-muted">불러오는 중이에요.</p> : null}
        {state?.status === "ready"
          ? state.items.map((candidate) => {
              const alreadyAdded = selectedKeys.has(candidate.menuKey);
              return (
                <div key={candidate.menuKey} className="rounded-control bg-surface-muted p-3">
                  <p className="font-semibold text-ink">{candidate.name}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {candidate.categoryId}
                    {candidate.distanceM !== undefined ? ` · ${candidate.distanceM}m` : ""}
                  </p>
                  <button
                    type="button"
                    disabled={!canAdd || alreadyAdded}
                    onClick={() => onAddCandidate(candidate)}
                    className="mt-2 rounded-control border border-line px-3 py-1 text-sm font-semibold disabled:opacity-40"
                  >
                    {alreadyAdded ? "후보에 있음" : "담기"}
                  </button>
                </div>
              );
            })
          : null}
        {state?.status === "ready" && state.totalPages > 1 ? (
          <div className="flex items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={state.page === 1}
              className="rounded-control border border-line px-3 py-2 text-sm font-semibold disabled:opacity-40"
            >
              이전 페이지
            </button>
            <p className="text-sm text-ink-muted">
              {state.page} / {state.totalPages} 페이지
            </p>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={state.page === state.totalPages}
              className="rounded-control border border-line px-3 py-2 text-sm font-semibold disabled:opacity-40"
            >
              다음 페이지
            </button>
          </div>
        ) : null}
        {state?.status === "empty" ? <p className="text-sm text-ink-muted">검색 결과가 없어요.</p> : null}
        {state?.status === "error" ? <p className="text-sm text-error">검색에 실패했어요. 다시 시도해 주세요.</p> : null}
      </div>
      {!canAdd ? <p className="mt-3 text-sm font-semibold text-brand-dark">최대 8개까지 담을 수 있어요.</p> : null}
    </section>
  );
}
