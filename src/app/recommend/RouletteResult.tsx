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
  const [done, setDone] = useState(false);
  const [rotation, setRotation] = useState(0);
  const wheelCandidates = candidates.slice(0, 8);
  const winnerIndex = Math.max(0, wheelCandidates.indexOf(restaurantName));
  const sector = 360 / Math.max(wheelCandidates.length, 1);
  const colors = ["#F28C28", "#FFD7A5", "#D96F12", "#FFE6C7", "#F6B66B", "#FFF4E8", "#E98B41", "#FAD0A6"];
  const background = `conic-gradient(${wheelCandidates.map((_, index) => `${colors[index % colors.length]} ${index * sector}deg ${(index + 1) * sector}deg`).join(", ")})`;

  useEffect(() => {
    if (!spinning) return;
    const timeout = window.setTimeout(() => {
      setSpinning(false);
      setDone(true);
    }, 1200);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [spinning]);

  function spin() {
    if (spinning) return;
    setDone(false);
    setSpinning(true);
    setRotation((current) => current + 1800 + (360 - winnerIndex * sector - sector / 2));
  }

  return (
    <section className="rounded-card bg-surface p-5 text-center shadow-card" aria-label="점심 룰렛">
      <p className="text-sm font-semibold text-brand-dark">점심 룰렛</p>
      <h2 className="mt-1 text-xl font-bold text-ink">{done ? "오늘의 점심은" : "조건에 맞는 곳을 골라볼까요?"}</h2>
      <div className="relative mx-auto my-7 h-64 w-64">
        <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 border-x-10 border-t-[22px] border-x-transparent border-t-ink" aria-hidden="true" />
        <div
          data-testid="roulette-wheel"
          className="relative h-full w-full overflow-hidden rounded-full border-8 border-surface shadow-[0_12px_28px_rgba(217,111,18,0.24)] transition-transform duration-[1200ms] ease-[cubic-bezier(.12,.7,.12,1)]"
          style={{ background, transform: `rotate(${rotation}deg)` }}
        >
          {wheelCandidates.map((candidate, index) => (
            <span key={candidate} className="absolute left-1/2 top-1/2 w-[42%] origin-left -translate-y-1/2 text-left text-xs font-extrabold leading-tight text-ink" style={{ transform: `rotate(${index * sector + sector / 2}deg) translateX(20%)` }}>
              {candidate}
            </span>
          ))}
          <div className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-brand bg-surface text-xs font-bold text-brand-dark">LUNCH</div>
        </div>
      </div>
      {done && <p className="-mt-3 mb-5 text-lg font-extrabold text-brand-dark">{restaurantName}</p>}
      {!done ? (
        <button type="button" onClick={spin} disabled={spinning} className="w-full rounded-control bg-brand px-4 py-3 text-sm font-semibold text-black disabled:opacity-60">
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
