"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  MAX_ROULETTE_SLOTS,
  addEntry,
  changeEntryWeight,
  getTotalSlots,
  pickWeightedEntry,
  removeEntry,
  type RouletteEntry,
} from "@/lib/recommend/roulette";

export interface RouletteCandidate {
  id: string;
  name: string;
}

export function createEntries(candidates: RouletteCandidate[], initialWinnerId: string): RouletteEntry[] {
  const limited = candidates.slice(0, MAX_ROULETTE_SLOTS);
  const initialWinner = candidates.find((candidate) => candidate.id === initialWinnerId);
  const entries = initialWinner && !limited.some((candidate) => candidate.id === initialWinner.id)
    ? [...limited.slice(0, -1), initialWinner]
    : limited;
  return entries.map((candidate) => ({ ...candidate, weight: 1 }));
}

export function RouletteResult({
  candidates,
  initialWinnerId,
  decideAction,
  entries: controlledEntries,
  onEntriesChange,
}: {
  candidates: RouletteCandidate[];
  initialWinnerId: string;
  decideAction: (restaurantId: string) => Promise<void>;
  entries?: RouletteEntry[];
  onEntriesChange?: Dispatch<SetStateAction<RouletteEntry[]>>;
}) {
  const [uncontrolledEntries, setUncontrolledEntries] = useState(() => createEntries(candidates, initialWinnerId));
  const entries = controlledEntries ?? uncontrolledEntries;
  const setEntries = onEntriesChange ?? setUncontrolledEntries;
  const [winnerId, setWinnerId] = useState(initialWinnerId);
  const [spinning, setSpinning] = useState(false);
  const [done, setDone] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [candidateToAdd, setCandidateToAdd] = useState("");
  const totalSlots = getTotalSlots(entries);
  const winner = entries.find((entry) => entry.id === winnerId) ?? entries[0] ?? null;
  const addableCandidates = candidates.filter((candidate) => !entries.some((entry) => entry.id === candidate.id));
  const colors = ["#F28C28", "#FFD7A5", "#D96F12", "#FFE6C7", "#F6B66B", "#FFF4E8", "#E98B41", "#FAD0A6"];
  const sectors = useMemo(() => {
    return entries.map((entry, index) => {
      const start = entries
        .slice(0, index)
        .reduce((angle, previousEntry) => angle + (totalSlots ? (previousEntry.weight / totalSlots) * 360 : 0), 0);
      const size = totalSlots ? (entry.weight / totalSlots) * 360 : 0;
      return { id: entry.id, start, size, midpoint: start + size / 2 };
    });
  }, [entries, totalSlots]);
  const background = `conic-gradient(${sectors.map((sector, index) => `${colors[index % colors.length]} ${sector.start}deg ${sector.start + sector.size}deg`).join(", ")})`;

  useEffect(() => {
    if (!spinning) return;
    const timeout = window.setTimeout(() => {
      setSpinning(false);
      setDone(true);
    }, 1200);
    return () => window.clearTimeout(timeout);
  }, [spinning]);

  function spin() {
    if (spinning || entries.length === 0) return;
    const selected = pickWeightedEntry(entries);
    if (!selected) return;
    const sector = sectors.find((item) => item.id === selected.id);
    setWinnerId(selected.id);
    setDone(false);
    setSpinning(true);
    setRotation((current) => current + 1800 + (270 - (sector?.midpoint ?? 0)));
  }

  function rebuild() {
    setEntries(createEntries(candidates, initialWinnerId));
    setWinnerId(initialWinnerId);
    setDone(false);
    setSpinning(false);
    setCandidateToAdd("");
  }

  return (
    <section className="rounded-card bg-surface p-5 text-center shadow-card" aria-label="점심 룰렛">
      <p className="text-sm font-semibold text-brand-dark">점심 룰렛</p>
      <h2 className="mt-1 text-xl font-bold text-ink">{done ? "오늘의 점심은" : "후보와 확률을 정해볼까요?"}</h2>
      <p className="mt-2 text-sm text-ink-muted">총 {totalSlots}칸 · 후보 {entries.length}곳</p>

      <div className="relative mx-auto my-7 h-64 w-64">
        <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 border-x-10 border-t-[22px] border-x-transparent border-t-ink" aria-hidden="true" />
        <div data-testid="roulette-wheel" className="relative h-full w-full overflow-hidden rounded-full border-8 border-surface shadow-[0_12px_28px_rgba(217,111,18,0.24)] transition-transform duration-[1200ms] ease-[cubic-bezier(.12,.7,.12,1)]" style={{ background, transform: `rotate(${rotation}deg)` }}>
          {entries.map((entry, index) => {
            const sector = sectors[index];
            return <span key={entry.id} className="absolute left-1/2 top-1/2 w-14 origin-left -translate-y-1/2 text-center text-[10px] font-extrabold leading-tight text-ink" style={{ transform: `rotate(${sector.midpoint}deg) translateX(52px)` }}>{entry.name}</span>;
          })}
          <div className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-brand bg-surface text-xs font-bold text-brand-dark">LUNCH</div>
        </div>
      </div>

      {done && winner ? <p className="-mt-3 mb-5 text-lg font-extrabold text-brand-dark">{winner.name}</p> : null}

      <div className="mb-5 rounded-control border border-line p-4 text-left">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-bold text-ink">후보 편집</h3>
          <button type="button" onClick={rebuild} className="text-sm font-semibold text-brand-dark underline">목록 재구성하기</button>
        </div>
        <div className="space-y-2">
          {entries.map((entry) => {
            const percent = totalSlots ? ((entry.weight / totalSlots) * 100).toFixed(1) : "0.0";
            return <div key={entry.id} className="flex items-center gap-2 rounded-control bg-surface-muted px-2 py-2">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{entry.name} · {entry.weight}칸 ({percent}%)</p>
              <button type="button" aria-label={`${entry.name} 칸 줄이기`} disabled={entry.weight === 1} onClick={() => setEntries((current) => changeEntryWeight(current, entry.id, -1))} className="size-8 rounded-control border border-line disabled:opacity-40">−</button>
              <button type="button" aria-label={`${entry.name} 칸 늘리기`} disabled={totalSlots >= MAX_ROULETTE_SLOTS} onClick={() => setEntries((current) => changeEntryWeight(current, entry.id, 1))} className="size-8 rounded-control border border-line disabled:opacity-40">+</button>
              <button type="button" aria-label={`${entry.name} 후보 삭제`} disabled={entries.length === 1} onClick={() => setEntries((current) => removeEntry(current, entry.id))} className="text-xs font-semibold text-ink-muted underline disabled:opacity-40">삭제</button>
            </div>;
          })}
        </div>
        {addableCandidates.length > 0 && totalSlots < MAX_ROULETTE_SLOTS ? <div className="mt-3 flex gap-2">
          <select aria-label="추가할 식당" value={candidateToAdd} onChange={(event) => setCandidateToAdd(event.target.value)} className="min-w-0 flex-1 rounded-control border border-line bg-surface px-3 py-2 text-sm">
            <option value="">식당 추가</option>
            {addableCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
          </select>
          <button type="button" disabled={!candidateToAdd} onClick={() => {
            const candidate = candidates.find((item) => item.id === candidateToAdd);
            if (candidate) setEntries((current) => addEntry(current, candidate));
            setCandidateToAdd("");
          }} className="rounded-control border border-line px-3 text-sm font-semibold disabled:opacity-40">추가</button>
        </div> : null}
      </div>

      <button type="button" onClick={spin} disabled={spinning} className="w-full rounded-control bg-brand px-4 py-3 text-sm font-semibold text-black disabled:opacity-60">
        {spinning ? "돌리는 중..." : done ? "현재 목록으로 다시 돌리기" : "룰렛 돌리기"}
      </button>
      {done && winner ? <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <form action={decideAction.bind(null, winner.id)}><button type="submit" className="w-full rounded-control bg-brand px-4 py-3 text-sm font-semibold text-black">여기로 결정</button></form>
        <Link href={`/appointments/new?restaurantId=${winner.id}`} className="rounded-control border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink">같이 먹기</Link>
        <Link href={`/polls/new?type=restaurant&selectedRestaurantId=${winner.id}`} className="rounded-control border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink sm:col-span-2">투표로 고르기</Link>
      </div> : null}
    </section>
  );
}
