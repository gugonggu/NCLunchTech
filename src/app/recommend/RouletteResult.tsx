"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function RouletteResult({
  candidates,
  restaurantId,
  restaurantName,
  decideAction,
  rerollAction,
}: {
  candidates: string[];
  restaurantId: string;
  restaurantName: string;
  decideAction: () => Promise<void>;
  rerollAction: () => Promise<void>;
}) {
  const [spinning, setSpinning] = useState(false);
  const [label, setLabel] = useState("룰렛");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!spinning) return;
    let index = 0;
    const interval = window.setInterval(() => {
      setLabel(candidates[index % candidates.length] ?? "룰렛");
      index += 1;
    }, 100);
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      setLabel(restaurantName);
      setSpinning(false);
      setDone(true);
    }, 1200);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [candidates, restaurantName, spinning]);

  return (
    <section className="rounded-card bg-surface p-5 text-center shadow-card" aria-label="점심 룰렛">
      <p className="text-sm font-semibold text-brand-dark">점심 룰렛</p>
      <h2 className="mt-1 text-xl font-bold text-ink">{done ? "오늘의 점심은" : "조건에 맞는 곳을 골라볼까요?"}</h2>
      <div className={`mx-auto my-6 flex h-40 w-40 items-center justify-center rounded-full border-8 border-brand bg-brand-soft px-4 text-lg font-bold text-brand-dark ${spinning ? "animate-spin" : ""}`}>
        {label}
      </div>
      {!done ? (
        <button type="button" onClick={() => setSpinning(true)} disabled={spinning} className="w-full rounded-control bg-brand px-4 py-3 text-sm font-semibold text-black disabled:opacity-60">
          {spinning ? "돌리는 중..." : "룰렛 돌리기"}
        </button>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <form action={rerollAction}>
            <button type="submit" className="w-full rounded-control border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink">다시 돌리기</button>
          </form>
          <form action={decideAction}>
            <button type="submit" className="w-full rounded-control bg-brand px-4 py-3 text-sm font-semibold text-black">여기로 결정</button>
          </form>
          <Link href={`/appointments/new?restaurantId=${restaurantId}`} className="rounded-control border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink">같이 먹기</Link>
          <Link href={`/polls/new?type=restaurant&selectedRestaurantId=${restaurantId}`} className="rounded-control border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink">투표로 넘기기</Link>
        </div>
      )}
    </section>
  );
}
