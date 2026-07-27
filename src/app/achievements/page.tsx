import Link from "next/link";
import { redirect } from "next/navigation";
import { GradientBackdrop, GRADIENT_TEXT } from "@/components/ui/GradientBackdrop";
import { getCurrentEmployee } from "@/lib/auth/session";
import { getMyAchievementSummary } from "@/lib/achievements/queries";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default async function AchievementsPage() {
  const employee = await getCurrentEmployee();
  if (!employee) redirect("/login?returnTo=%2Fachievements");

  const summary = await getMyAchievementSummary(employee.id);

  return (
    <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 overflow-hidden px-6 py-8">
      <GradientBackdrop />
      <div>
        <Link href="/me" className="text-sm text-ink-muted">
          ← 내 정보로
        </Link>
        <h1 className={`mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl ${GRADIENT_TEXT}`}>업적</h1>
      </div>

      <section className="grid grid-cols-2 gap-3" aria-label="업적 요약">
        <div className="rounded-card bg-surface px-4 py-4 shadow-card">
          <p className="text-sm text-ink-muted">업적 포인트</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-dark">{summary.totalPoints}점</p>
        </div>
        <div className="rounded-card bg-surface px-4 py-4 shadow-card">
          <p className="text-sm text-ink-muted">달성 업적</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-dark">
            {summary.earnedCount} / {summary.totalCount}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-label="업적 목록">
        {summary.items.map((item) => (
          <div key={item.code} className="rounded-card bg-surface px-4 py-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">{item.name}</h2>
                <p className="mt-1 text-sm text-ink-muted">{item.description}</p>
              </div>
              {item.earned ? (
                <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-dark">
                  달성
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-ink-muted">
                  {item.pointReward}점
                </span>
              )}
            </div>

            {item.earned ? (
              <p className="mt-3 text-sm tabular-nums text-ink-muted">
                {item.earnedAt && dateFormatter.format(new Date(item.earnedAt))} 달성
                {item.titleName && (
                  <span className="ml-1 font-semibold text-brand-dark">· 칭호 &lsquo;{item.titleName}&rsquo; 해금</span>
                )}
              </p>
            ) : (
              !item.isHidden && (
                <p className="mt-3 text-sm tabular-nums text-ink-muted">
                  {item.currentValue} / {item.targetValue}
                </p>
              )
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
