"use client";

import { useState } from "react";
import type { WorldcupCandidate } from "@/lib/worldcup/candidates";
import type { WorldcupGameType } from "@/lib/worldcup/validation";
import { WorldcupCandidateSearch } from "./WorldcupCandidateSearch";

const MAX_CUSTOM_CANDIDATES = 8;
const STARTABLE_SIZES = [4, 8];

export function WorldcupCustomWorkspace({
  gameType,
  recommendedPool,
  startAction,
}: {
  gameType: WorldcupGameType;
  recommendedPool: WorldcupCandidate[];
  startAction: (gameType: WorldcupGameType, candidates: WorldcupCandidate[]) => Promise<void>;
}) {
  const [candidates, setCandidates] = useState<WorldcupCandidate[]>([]);
  const [isStarting, setIsStarting] = useState(false);

  const selectedKeys = new Set(candidates.map((c) => c.menuKey));
  const canAdd = candidates.length < MAX_CUSTOM_CANDIDATES;
  const canStart = STARTABLE_SIZES.includes(candidates.length) && !isStarting;
  const recommended = recommendedPool.filter((c) => !selectedKeys.has(c.menuKey)).slice(0, 10);

  function addCandidate(candidate: WorldcupCandidate) {
    setCandidates((current) => (current.some((c) => c.menuKey === candidate.menuKey) ? current : [...current, candidate]));
  }

  function removeCandidate(menuKey: string) {
    setCandidates((current) => current.filter((c) => c.menuKey !== menuKey));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex flex-col gap-4">
        <section className="rounded-card bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-ink">담은 후보</h2>
            <p className="text-sm tabular-nums text-ink-muted">
              {candidates.length} / {MAX_CUSTOM_CANDIDATES}
            </p>
          </div>

          {candidates.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">검색하거나 추천 후보에서 담아보세요.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {candidates.map((candidate) => (
                <li
                  key={candidate.menuKey}
                  className="flex items-center justify-between gap-2 rounded-control bg-surface-muted px-3 py-2"
                >
                  <span className="text-sm font-semibold text-ink">{candidate.name}</span>
                  <button
                    type="button"
                    onClick={() => removeCandidate(candidate.menuKey)}
                    className="shrink-0 text-sm text-ink-muted underline"
                  >
                    빼기
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-3 text-xs text-ink-muted">4개 또는 8개를 담아야 월드컵을 시작할 수 있어요.</p>

          <button
            type="button"
            disabled={!canStart}
            onClick={() => {
              setIsStarting(true);
              void startAction(gameType, candidates).catch(() => setIsStarting(false));
            }}
            className="mt-4 w-full rounded-control bg-brand px-3 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            이 후보로 {candidates.length === 8 ? "8강" : "4강"} 시작
          </button>
        </section>

        <section className="rounded-card bg-surface p-4 shadow-card" aria-label="추천 후보">
          <h2 className="text-base font-bold text-ink">추천 후보</h2>
          <p className="mt-1 text-sm text-ink-muted">직접 고르기 어렵다면 추천 후보를 담아보세요.</p>
          <ul className="mt-3 space-y-2">
            {recommended.map((candidate) => (
              <li
                key={candidate.menuKey}
                className="flex items-center justify-between gap-2 rounded-control bg-surface-muted px-3 py-2"
              >
                <span className="text-sm font-semibold text-ink">{candidate.name}</span>
                <button
                  type="button"
                  disabled={!canAdd}
                  onClick={() => addCandidate(candidate)}
                  className="shrink-0 rounded-control border border-line px-3 py-1 text-sm font-semibold disabled:opacity-40"
                >
                  담기
                </button>
              </li>
            ))}
            {recommended.length === 0 ? <p className="text-sm text-ink-muted">추천할 후보가 더 없어요.</p> : null}
          </ul>
        </section>
      </div>

      <aside className="lg:col-start-2" aria-label="월드컵 후보 검색">
        <WorldcupCandidateSearch
          gameType={gameType}
          selectedKeys={selectedKeys}
          canAdd={canAdd}
          onAddCandidate={addCandidate}
        />
      </aside>
    </div>
  );
}
