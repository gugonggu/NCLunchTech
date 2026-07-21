import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { getMonthlyLeaderboard } from "@/lib/leaderboard-queries";

const CATEGORY_META = {
  review: { title: "리뷰왕", description: "이번 달 작성한 리뷰", unit: "개" },
  explorer: { title: "점심 개척왕", description: "이번 달 방문한 서로 다른 식당", unit: "곳" },
  menu: { title: "메뉴 수집왕", description: "이번 달 기록한 먹은 메뉴", unit: "개" },
} as const;

export default async function LeaderboardPage() {
  const employee = await getCurrentEmployee();
  if (!employee) redirect("/login?returnTo=%2Fleaderboard");

  const leaderboard = await getMonthlyLeaderboard(employee.id);

  return (
    <main className="flex flex-1 flex-col gap-5 bg-brand-bg px-6 py-8">
      <div>
        <Link href="/me" className="text-sm text-ink-muted">
          ← 내 정보로
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-brand-dark">월간 배지·리더보드</h1>
        <p className="mt-1 text-sm text-ink-muted">집계 기간 · {leaderboard.label}</p>
      </div>

      {(Object.keys(CATEGORY_META) as Array<keyof typeof CATEGORY_META>).map((key) => {
        const meta = CATEGORY_META[key];
        const category = leaderboard.categories[key];
        return (
          <section key={key} className="rounded-card bg-surface px-4 py-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-brand-dark">{meta.title}</h2>
                <p className="text-sm text-ink-muted">{meta.description}</p>
              </div>
              <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                월간 배지
              </span>
            </div>

            {category.leaders.length === 0 ? (
              <p className="mt-4 rounded-xl bg-surface-muted px-3 py-3 text-sm text-ink-muted">
                이번 달 기록이 아직 없어요.
              </p>
            ) : (
              <ol className="mt-4 flex flex-col gap-2">
                {category.leaders.map((row) => (
                  <li key={row.employeeId} className="flex items-center justify-between rounded-xl bg-brand-soft px-3 py-2">
                    <span className="font-semibold tabular-nums text-brand-dark">
                      {row.rank}위 · {row.nickname}
                    </span>
                    <span className="text-sm tabular-nums text-ink-muted">
                      {row.score}{meta.unit}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            <p className="mt-3 border-t border-line pt-3 text-sm font-semibold tabular-nums text-brand-dark">
              {category.myRank
                ? `내 순위 · ${category.myRank.rank}위 (${category.myRank.score}${meta.unit})`
                : "내 기록 · 아직 없음"}
            </p>
          </section>
        );
      })}
    </main>
  );
}
