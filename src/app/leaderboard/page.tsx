import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { getMonthlyLeaderboard } from "@/lib/leaderboard-queries";
import { getSeoulMonthRange } from "@/lib/leaderboard";
import {
  getFinalizedMonthlyLeaderboard,
  getMonthlyLeaderboardMonths,
} from "@/lib/monthly-leaders/queries";
import { MONTHLY_LEADER_LABEL } from "@/lib/monthly-leaders/ranking";
import { monthlyLeaderboardMonthSchema } from "@/lib/monthly-leaders/validation";
import { getRestaurantOfTheMonth } from "@/lib/restaurant-of-the-month-queries";
import { RestaurantOfTheMonthCard } from "@/components/lunch/RestaurantOfTheMonthCard";
import { GradientBackdrop, GRADIENT_TEXT } from "@/components/ui/GradientBackdrop";

const CATEGORY_META = {
  review: { title: "리뷰왕", description: "이번 달 작성한 리뷰", unit: "개" },
  explorer: { title: "점심 개척왕", description: "이번 달 방문한 서로 다른 식당", unit: "곳" },
  menu: { title: "메뉴 수집왕", description: "이번 달 기록한 먹은 메뉴", unit: "개" },
  total: { title: "종합 순위", description: "리뷰·새 식당·메뉴 기록을 합한 점수", unit: "점" },
} as const;

type LeaderboardPageProps = {
  searchParams?: Promise<{ month?: string | string[] }>;
};

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps = {}) {
  const employee = await getCurrentEmployee();
  if (!employee) redirect("/login?returnTo=%2Fleaderboard");

  const currentMonth = getSeoulMonthRange(new Date());
  const finalizedMonths = await getMonthlyLeaderboardMonths();
  const requestedMonth = (await searchParams)?.month;
  const parsedMonth = typeof requestedMonth === "string" ? monthlyLeaderboardMonthSchema.safeParse(requestedMonth) : null;
  const selectedFinalizedMonth = parsedMonth?.success
    ? finalizedMonths.find((month) => month.monthKey === requestedMonth)
    : undefined;
  const selectedFinalizedLeaderboard = selectedFinalizedMonth
    ? await getFinalizedMonthlyLeaderboard(selectedFinalizedMonth.monthKey, employee.id)
    : null;
  const isFinalizedMonth = selectedFinalizedLeaderboard !== null;
  const availableMonths = [
    { monthKey: currentMonth.startDate.slice(0, 7), label: currentMonth.label },
    ...finalizedMonths.filter((month) => month.monthKey !== currentMonth.startDate.slice(0, 7)),
  ];
  const selectedMonthKey = isFinalizedMonth ? selectedFinalizedMonth!.monthKey : currentMonth.startDate.slice(0, 7);

  const [leaderboard, restaurantOfTheMonth] = isFinalizedMonth
    ? [null, null]
    : await Promise.all([getMonthlyLeaderboard(employee.id), getRestaurantOfTheMonth()]);

  return (
    <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 overflow-hidden px-6 py-8">
      <GradientBackdrop />
      <div>
        <Link href="/me" className="text-sm text-ink-muted">
          ← 내 정보로
        </Link>
        <h1 className={`mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl ${GRADIENT_TEXT}`}>월간 배지·리더보드</h1>
        <p className="mt-1 text-sm text-ink-muted">
          집계 기간 · {isFinalizedMonth ? selectedFinalizedMonth!.label : leaderboard!.label}
        </p>
      </div>

      <form className="flex items-end gap-2" method="get">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-semibold text-brand-dark">
          조회 월
          <select name="month" defaultValue={selectedMonthKey} className="rounded-control border border-line bg-surface px-3 py-2 text-ink">
            {availableMonths.map((month) => (
              <option key={month.monthKey} value={month.monthKey}>
                {month.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white">
          보기
        </button>
      </form>

      {isFinalizedMonth ? (
        <section className="rounded-card bg-surface px-4 py-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-brand-dark">종합 순위</h2>
              <p className="text-sm text-ink-muted">확정된 월간 기록입니다.</p>
            </div>
            <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">확정</span>
          </div>

          {selectedFinalizedLeaderboard!.entries.length === 0 ? (
            <p className="mt-4 rounded-xl bg-surface-muted px-3 py-3 text-sm text-ink-muted">기록이 없어요.</p>
          ) : (
            <ol className="mt-4 flex flex-col gap-2">
              {selectedFinalizedLeaderboard!.entries.map((entry) => (
                <li key={entry.employeeId} className="rounded-xl bg-brand-soft px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold tabular-nums text-brand-dark">{entry.rank}위 · {entry.nickname}</span>
                    <span className="text-sm tabular-nums text-ink-muted">{entry.totalScore}점</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-sm text-ink-muted">
                    <span>리뷰 {entry.reviewScore} · 개척 {entry.explorerScore} · 메뉴 {entry.menuScore}</span>
                    {entry.isMonthlyLeader && (
                      <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-brand-dark">
                        {MONTHLY_LEADER_LABEL}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : (
        <>
          {restaurantOfTheMonth && <RestaurantOfTheMonthCard restaurant={restaurantOfTheMonth} compact />}

          {(Object.keys(CATEGORY_META) as Array<keyof typeof CATEGORY_META>).map((key) => {
            const meta = CATEGORY_META[key];
            const category = leaderboard!.categories[key];
            return (
              <section key={key} className="rounded-card bg-surface px-4 py-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-brand-dark">{meta.title}</h2>
                    <p className="text-sm text-ink-muted">{meta.description}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                    {key === "total" ? MONTHLY_LEADER_LABEL : "월간 배지"}
                  </span>
                </div>

                {category.leaders.length === 0 ? (
                  <p className="mt-4 rounded-xl bg-surface-muted px-3 py-3 text-sm text-ink-muted">이번 달 기록이 아직 없어요.</p>
                ) : (
                  <ol className="mt-4 flex flex-col gap-2">
                    {category.leaders.map((row) => (
                      <li key={row.employeeId} className="flex items-center justify-between rounded-xl bg-brand-soft px-3 py-2">
                        <span className="font-semibold tabular-nums text-brand-dark">{row.rank}위 · {row.nickname}</span>
                        <span className="text-sm tabular-nums text-ink-muted">{row.score}{meta.unit}</span>
                      </li>
                    ))}
                  </ol>
                )}

                <p className="mt-3 border-t border-line pt-3 text-sm font-semibold tabular-nums text-brand-dark">
                  {category.myRank ? `내 순위 · ${category.myRank.rank}위 (${category.myRank.score}${meta.unit})` : "내 기록 · 아직 없음"}
                </p>
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}
