import Link from "next/link";
import { redirect } from "next/navigation";
import { GradientBackdrop, GRADIENT_TEXT } from "@/components/ui/GradientBackdrop";
import { getCurrentEmployee } from "@/lib/auth/session";
import { getMyAchievementSummary } from "@/lib/achievements/queries";
import { AchievementsList } from "./AchievementsList";

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

      <AchievementsList items={summary.items} />
    </main>
  );
}
