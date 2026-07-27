"use client";

import { useState } from "react";
import { RouletteResult, createEntries, type RouletteCandidate } from "@/app/recommend/RouletteResult";
import { MAX_ROULETTE_SLOTS, addEntry, getTotalSlots, type RouletteEntry } from "@/lib/recommend/roulette";
import { RouletteRestaurantSearch } from "./RouletteRestaurantSearch";

export function RouletteWorkspace({
  initialCandidates,
  decideAction,
}: {
  initialCandidates: RouletteCandidate[];
  decideAction: (restaurantId: string) => Promise<void>;
}) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [rebuildCandidates, setRebuildCandidates] = useState(initialCandidates);
  const [entries, setEntries] = useState<RouletteEntry[]>(() =>
    createEntries(initialCandidates, initialCandidates[0]?.id ?? ""),
  );

  function addCandidate(candidate: RouletteCandidate) {
    setCandidates((current) => current.some((item) => item.id === candidate.id) ? current : [...current, candidate]);
    setEntries((current) => addEntry(current, candidate));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <RouletteResult
        candidates={candidates}
        entries={entries}
        onEntriesChange={setEntries}
        rebuildCandidates={rebuildCandidates}
        initialWinnerId={entries[0]?.id ?? ""}
        decideAction={decideAction}
      />
      <aside className="lg:col-start-2" aria-label="룰렛 식당 검색">
        <RouletteRestaurantSearch
          selectedIds={new Set(entries.map((entry) => entry.id))}
          canAdd={getTotalSlots(entries) < MAX_ROULETTE_SLOTS}
          onAddCandidate={addCandidate}
          onSearchCandidatesChange={setRebuildCandidates}
        />
      </aside>
    </div>
  );
}
