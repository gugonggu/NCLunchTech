"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function TieRoulette({ pollId, options, resolve }: { pollId: string; options: Array<{ id: string; label: string }>; resolve: (pollId: string, optionId: string) => Promise<void> }) {
  const router = useRouter(); const [spinning, setSpinning] = useState(false); const [winner, setWinner] = useState<string | null>(null);
  async function spin() {
    if (spinning) return; setSpinning(true); setWinner(null);
    const selected = options[Math.floor(Math.random() * options.length)];
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1200));
    setWinner(selected.label); await resolve(pollId, selected.id); router.refresh();
  }
  return <section className="rounded-card bg-surface p-4 text-center shadow-card"><h2 className="text-base font-bold text-ink">동점 룰렛</h2><p className="mt-1 text-sm text-ink-muted">공동 1위 중 한 곳을 공정하게 골라요.</p><div className={`mx-auto my-4 flex h-28 w-28 items-center justify-center rounded-full border-8 border-brand bg-brand-soft px-2 text-sm font-bold text-brand-dark ${spinning ? "animate-spin" : ""}`}>{winner ?? (spinning ? "돌리는 중" : "룰렛")}</div><button type="button" disabled={spinning} onClick={spin} className="w-full rounded-control bg-brand px-4 py-3 text-sm font-semibold text-black disabled:opacity-60">{spinning ? "결정 중..." : "룰렛 돌리기"}</button></section>;
}
