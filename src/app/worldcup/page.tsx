import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonStyles } from "@/components/ui/Button";
import { GradientBackdrop, GRADIENT_TEXT } from "@/components/ui/GradientBackdrop";
import { getCurrentEmployee } from "@/lib/auth/session";
import { getActiveWorldcupSession } from "@/lib/worldcup/service";
import { isWorldcupStatusCode, WORLDCUP_STATUS_MESSAGES } from "@/lib/worldcup/validation";
import { startWorldcup } from "./actions";

const GAME_TYPE_LABELS = {
  MENU: "메뉴 월드컵",
  RESTAURANT: "식당 월드컵",
} as const;

export default async function WorldcupPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const employee = await getCurrentEmployee();
  if (!employee) redirect("/login?returnTo=%2Fworldcup");

  const params = await searchParams;
  const statusMessage = isWorldcupStatusCode(params?.status) ? WORLDCUP_STATUS_MESSAGES[params.status] : null;

  const activeSession = await getActiveWorldcupSession(employee.id);

  return (
    <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 overflow-hidden px-6 py-8">
      <GradientBackdrop />
      <div>
        <Link href="/" className="text-sm text-ink-muted">
          ← 홈으로
        </Link>
        <h1 className={`mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl ${GRADIENT_TEXT}`}>
          오늘의 메뉴 월드컵
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          8개(또는 4개)의 메뉴나 식당 중 가장 마음에 드는 곳을 골라보세요. 30초면 끝나요.
        </p>
      </div>

      {statusMessage && (
        <p className="rounded-control bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-dark">
          {statusMessage}
        </p>
      )}

      {activeSession && (
        <section className="flex flex-col gap-3 rounded-card bg-surface px-4 py-4 shadow-card">
          <p className="text-sm font-semibold text-ink">
            진행 중인 {GAME_TYPE_LABELS[activeSession.gameType]}이 있어요.
          </p>
          <Link href={`/worldcup/${activeSession.id}`} className={buttonStyles({ variant: "primary", block: true })}>
            이어하기
          </Link>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <form action={startWorldcup.bind(null, "MENU")}>
          <button type="submit" className={buttonStyles({ variant: activeSession ? "secondary" : "primary", block: true })}>
            메뉴 월드컵 {activeSession ? "새로 시작하기" : "시작"}
          </button>
        </form>
        <form action={startWorldcup.bind(null, "RESTAURANT")}>
          <button type="submit" className={buttonStyles({ variant: "secondary", block: true })}>
            식당 월드컵 {activeSession ? "새로 시작하기" : "시작"}
          </button>
        </form>
      </section>
    </main>
  );
}
