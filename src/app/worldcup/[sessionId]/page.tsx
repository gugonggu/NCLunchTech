import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonStyles } from "@/components/ui/Button";
import { GradientBackdrop, GRADIENT_TEXT } from "@/components/ui/GradientBackdrop";
import { RestaurantVisual } from "@/components/lunch/RestaurantVisual";
import { getCurrentEmployee } from "@/lib/auth/session";
import { getRoundLabel } from "@/lib/worldcup/bracket";
import type { WorldcupCandidate } from "@/lib/worldcup/candidates";
import { getWorldcupResultRestaurants } from "@/lib/worldcup/pool-queries";
import { getWorldcupSessionDetail } from "@/lib/worldcup/service";
import { isWorldcupStatusCode, UUID_PATTERN, WORLDCUP_STATUS_MESSAGES } from "@/lib/worldcup/validation";
import { abandonWorldcupAction, decideWorldcupWinnerRestaurant, selectWorldcupMatchAction, startWorldcup } from "../actions";

function MatchOptionContent({ candidate, isRestaurantMode }: { candidate: WorldcupCandidate; isRestaurantMode: boolean }) {
  if (!isRestaurantMode) {
    return <span className="text-xl font-bold text-ink">{candidate.name}</span>;
  }

  return (
    <div className="w-full overflow-hidden rounded-card">
      <RestaurantVisual name={candidate.name} category={candidate.categoryId} photoUrl={candidate.photoUrl ?? null} />
      <div className="px-4 py-3 text-left">
        <p className="text-lg font-bold text-ink">{candidate.name}</p>
        <p className="mt-1 text-sm text-ink-muted">
          {candidate.distanceM !== undefined ? `${candidate.distanceM}m` : ""}
          {candidate.representativeMenuName && ` · ${candidate.representativeMenuName}`}
          {candidate.representativeMenuPrice !== null && candidate.representativeMenuPrice !== undefined
            ? ` ${candidate.representativeMenuPrice.toLocaleString("ko-KR")}원`
            : ""}
        </p>
      </div>
    </div>
  );
}

export default async function WorldcupSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams?: Promise<{ status?: string }>;
}) {
  const employee = await getCurrentEmployee();
  if (!employee) redirect("/login?returnTo=%2Fworldcup");

  const { sessionId } = await params;
  if (!UUID_PATTERN.test(sessionId)) {
    redirect("/worldcup?status=not_found");
  }

  const search = await searchParams;
  const statusMessage = isWorldcupStatusCode(search?.status) ? WORLDCUP_STATUS_MESSAGES[search.status] : null;

  const session = await getWorldcupSessionDetail(sessionId, employee.id);
  if (!session) {
    redirect("/worldcup?status=not_found");
  }

  if (session.status === "ABANDONED") {
    redirect("/worldcup?status=abandoned");
  }

  const isRestaurantMode = session.gameType === "RESTAURANT";
  const candidateByKey = new Map(session.candidates.map((c) => [c.menuKey, c]));

  if (session.status === "COMPLETED" && session.winnerMenuKey) {
    const winner = session.candidates.find((c) => c.menuKey === session.winnerMenuKey);
    const resultRestaurants =
      !isRestaurantMode && winner ? await getWorldcupResultRestaurants(winner.restaurantIds, session.winnerMenuKey) : [];

    return (
      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 overflow-hidden px-6 py-8">
        <GradientBackdrop />
        <div>
          <Link href="/worldcup" className="text-sm text-ink-muted">
            ← 메뉴 월드컵
          </Link>
          <p className="mt-3 text-sm text-ink-muted">{isRestaurantMode ? "오늘의 우승 식당" : "오늘의 우승 메뉴"}</p>
          <h1 className={`mt-1 text-3xl font-extrabold tracking-tight ${GRADIENT_TEXT}`}>
            {winner?.name ?? (isRestaurantMode ? "식당" : "메뉴")}
          </h1>
        </div>

        {isRestaurantMode && winner ? (
          <section className="rounded-card bg-surface shadow-card overflow-hidden">
            <RestaurantVisual name={winner.name} category={winner.categoryId} photoUrl={winner.photoUrl ?? null} priority />
            <div className="p-4">
              <p className="text-sm text-ink-muted">
                {winner.distanceM !== undefined ? `회사에서 약 ${winner.distanceM}m` : ""}
                {winner.representativeMenuName && ` · ${winner.representativeMenuName}`}
                {winner.representativeMenuPrice !== null && winner.representativeMenuPrice !== undefined
                  ? ` ${winner.representativeMenuPrice.toLocaleString("ko-KR")}원`
                  : ""}
              </p>
              <form action={decideWorldcupWinnerRestaurant.bind(null, sessionId, winner.restaurantIds[0])} className="mt-3">
                <button type="submit" className={buttonStyles({ variant: "secondary", block: true })}>
                  이 식당으로 결정
                </button>
              </form>
            </div>
          </section>
        ) : resultRestaurants.length > 0 ? (
          <section className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-ink-muted">추천 식당</p>
            {resultRestaurants.map((restaurant, index) => (
              <div key={restaurant.id} className="rounded-card bg-surface px-4 py-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-ink">
                      {index + 1}. {restaurant.name}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {restaurant.distanceM}m
                      {restaurant.menuPrice !== null
                        ? ` · ${restaurant.menuPrice.toLocaleString("ko-KR")}원`
                        : " · 가격 정보 없음"}
                    </p>
                  </div>
                </div>
                <form action={decideWorldcupWinnerRestaurant.bind(null, sessionId, restaurant.id)} className="mt-3">
                  <button type="submit" className={buttonStyles({ variant: "secondary", size: "compact", block: true })}>
                    이 식당으로 결정
                  </button>
                </form>
              </div>
            ))}
          </section>
        ) : (
          <p className="rounded-card bg-surface px-4 py-4 text-sm text-ink-muted shadow-card">
            이 메뉴를 파는 식당 정보를 찾지 못했어요.
          </p>
        )}

        <form action={startWorldcup.bind(null, session.gameType)}>
          <button type="submit" className={buttonStyles({ variant: "ghost", block: true })}>
            월드컵 다시 하기
          </button>
        </form>
        <Link href="/" className={buttonStyles({ variant: "ghost", block: true })}>
          홈으로 이동
        </Link>
      </main>
    );
  }

  const currentRoundMatches = session.matches
    .filter((m) => m.roundNumber === session.currentRound)
    .sort((a, b) => a.matchIndex - b.matchIndex);
  const selectedCount = currentRoundMatches.filter((m) => m.selectedMenuKey !== null).length;
  const currentMatch = currentRoundMatches.find((m) => m.selectedMenuKey === null);

  if (!currentMatch) {
    // 다음 라운드로 막 전환된 직후일 수 있으니 새로고침을 안내한다(정상 흐름에서는 거의 발생하지 않음).
    redirect(`/worldcup/${sessionId}`);
  }

  const leftCandidate = candidateByKey.get(currentMatch.leftMenuKey);
  const rightCandidate = candidateByKey.get(currentMatch.rightMenuKey);

  return (
    <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 overflow-hidden px-6 py-8">
      <GradientBackdrop />
      <div>
        <Link href="/worldcup" className="text-sm text-ink-muted">
          ← {isRestaurantMode ? "식당 월드컵" : "메뉴 월드컵"}
        </Link>
        <p className="mt-3 text-sm font-semibold text-ink-muted">
          {getRoundLabel(session.currentRound, session.tournamentSize)} · {selectedCount} / {currentRoundMatches.length}
        </p>
      </div>

      {statusMessage && (
        <p className="rounded-control bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-dark">{statusMessage}</p>
      )}

      <section className="relative grid grid-cols-2 gap-3">
        <form action={selectWorldcupMatchAction.bind(null, sessionId, currentMatch.id, currentMatch.leftMenuKey)}>
          <button
            type="submit"
            className="flex h-full w-full items-center justify-center rounded-card bg-surface p-0 text-center shadow-card transition active:scale-[0.98]"
          >
            {leftCandidate ? (
              <div className={isRestaurantMode ? "w-full" : "px-3 py-10"}>
                <MatchOptionContent candidate={leftCandidate} isRestaurantMode={isRestaurantMode} />
              </div>
            ) : (
              currentMatch.leftMenuKey
            )}
          </button>
        </form>
        <form action={selectWorldcupMatchAction.bind(null, sessionId, currentMatch.id, currentMatch.rightMenuKey)}>
          <button
            type="submit"
            className="flex h-full w-full items-center justify-center rounded-card bg-surface p-0 text-center shadow-card transition active:scale-[0.98]"
          >
            {rightCandidate ? (
              <div className={isRestaurantMode ? "w-full" : "px-3 py-10"}>
                <MatchOptionContent candidate={rightCandidate} isRestaurantMode={isRestaurantMode} />
              </div>
            ) : (
              currentMatch.rightMenuKey
            )}
          </button>
        </form>
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-canvas text-xs font-extrabold text-ink-muted shadow-card"
        >
          VS
        </span>
      </section>

      <form action={abandonWorldcupAction.bind(null, sessionId)}>
        <button type="submit" className={buttonStyles({ variant: "ghost", block: true })}>
          그만하기
        </button>
      </form>
    </main>
  );
}
