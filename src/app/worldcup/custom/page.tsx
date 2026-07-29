import Link from "next/link";
import { redirect } from "next/navigation";
import { GradientBackdrop, GRADIENT_TEXT } from "@/components/ui/GradientBackdrop";
import { getCurrentEmployee } from "@/lib/auth/session";
import { getWorldcupRecommendedCandidates } from "@/lib/worldcup/service";
import { isWorldcupGameType, type WorldcupGameType } from "@/lib/worldcup/validation";
import { startCustomWorldcupAction } from "../actions";
import { WorldcupCustomWorkspace } from "./WorldcupCustomWorkspace";

const GAME_TYPE_LABELS: Record<WorldcupGameType, string> = {
  MENU: "메뉴 월드컵",
  RESTAURANT: "식당 월드컵",
};

export default async function WorldcupCustomPage({
  searchParams,
}: {
  searchParams?: Promise<{ gameType?: string; status?: string }>;
}) {
  const employee = await getCurrentEmployee();
  if (!employee) redirect("/login?returnTo=%2Fworldcup%2Fcustom");

  const params = await searchParams;
  const gameType: WorldcupGameType = isWorldcupGameType(params?.gameType ?? "") ? (params!.gameType as WorldcupGameType) : "MENU";
  const recommendedPool = await getWorldcupRecommendedCandidates(gameType, 20);

  return (
    <main className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 overflow-hidden px-6 py-8">
      <GradientBackdrop />
      <div>
        <Link href="/worldcup" className="text-sm text-ink-muted">
          ← 월드컵으로
        </Link>
        <h1 className={`mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl ${GRADIENT_TEXT}`}>
          {GAME_TYPE_LABELS[gameType]} 직접 담기
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          검색하거나 추천 후보에서 골라 4개 또는 8개를 담으면 월드컵을 시작할 수 있어요.
        </p>
      </div>

      {params?.status === "invalid_candidates" && (
        <p className="rounded-control bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-dark">
          담은 후보 중 지금은 고를 수 없는 항목이 있었어요. 다시 담아주세요.
        </p>
      )}

      <WorldcupCustomWorkspace gameType={gameType} recommendedPool={recommendedPool} startAction={startCustomWorldcupAction} />
    </main>
  );
}
