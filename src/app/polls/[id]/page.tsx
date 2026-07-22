import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { getPollDetail, getWinningIds, isEligibleAppointmentVoter } from "@/lib/polls/queries";
import { POLL_STATUS_MESSAGES, isPollStatusCode, isValidRestaurantPollBridge } from "@/lib/polls/validation";
import { buttonStyles } from "@/components/ui/Button";
import { GradientBackdrop, GRADIENT_TEXT } from "@/components/ui/GradientBackdrop";
import { cancelVote, closePoll, decidePoll, resolvePollTie, voteInPoll } from "./actions";

const displayFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function PollDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const { status } = await searchParams;

  const employee = await getCurrentEmployee();
  const poll = await getPollDetail(id, employee?.id ?? null);
  if (!poll) {
    notFound();
  }

  const feedbackMessage = isPollStatusCode(status) ? POLL_STATUS_MESSAGES[status] : null;
  const isCreator = employee?.id === poll.createdBy;
  const isOpen = poll.status === "open";
  const winningIds = poll.status !== "open" ? getWinningIds(poll.options) : [];
  const canVote =
    !!employee && (!poll.appointmentId || (await isEligibleAppointmentVoter(poll.appointmentId, employee.id)));
  const decidedOption = poll.decidedOptionId
    ? poll.options.find((o) => o.id === poll.decidedOptionId)
    : undefined;
  const decidedOptionRestaurantId = decidedOption?.restaurantId ?? null;
  const canBridgeToAppointment =
    isCreator &&
    !!decidedOptionRestaurantId &&
    isValidRestaurantPollBridge({
      pollType: poll.pollType,
      status: poll.status,
      appointmentId: poll.appointmentId,
      decidedOptionRestaurantId,
      targetRestaurantId: decidedOptionRestaurantId,
    });

  return (
    <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 overflow-hidden px-6 py-8">
      <GradientBackdrop />
      <Link href="/" className="text-sm text-ink-muted">
        ← 홈으로
      </Link>

      <h1 className={`text-2xl font-extrabold tracking-tight sm:text-3xl ${GRADIENT_TEXT}`}>
        {poll.pollType === "restaurant" ? "식당 투표" : "메뉴 투표"}
      </h1>
      {poll.pollType === "menu" && poll.restaurantName && (
        <p className="text-ink">{poll.restaurantName}</p>
      )}
      {poll.appointmentId && (
        <Link href={`/appointments/${poll.appointmentId}`} className="text-sm text-ink-muted underline">
          연결된 약속 보기
        </Link>
      )}

      {feedbackMessage && (
        <p className="rounded-card bg-surface px-4 py-3 text-sm text-brand-dark shadow-card">{feedbackMessage}</p>
      )}

      <p className="text-sm text-ink-muted">
        {poll.status === "open" && `${displayFormatter.format(new Date(poll.closesAt))}에 마감`}
        {poll.status === "closed" && "마감됨 · 결과 확정 대기 중"}
        {poll.status === "decided" && "결과가 확정됐어요"}
      </p>

      <ul className="flex flex-col gap-2">
        {poll.options.map((option) => {
          const isMine = poll.myOptionId === option.id;
          const isDecided = poll.decidedOptionId === option.id;
          const isWinning = winningIds.includes(option.id);

          return (
            <li key={option.id}>
              <div
                className={`flex items-center justify-between rounded-card px-4 py-3 ${
                  isDecided ? "border border-brand bg-brand-bg" : isMine ? "border border-brand bg-surface shadow-card" : "bg-surface shadow-card"
                }`}
              >
                <span>
                  {option.label}
                  {isMine && <span className="ml-2 text-xs text-brand-dark">내 선택</span>}
                  {isDecided && <span className="ml-2 text-xs font-semibold text-brand-dark">결정됨</span>}
                  {!isDecided && poll.status !== "open" && isWinning && (
                    <span className="ml-2 text-xs text-ink-muted">공동 1위</span>
                  )}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-sm tabular-nums text-ink-muted">{option.voteCount}표</span>
                  {isOpen && canVote && (
                    <form action={voteInPoll.bind(null, poll.id, option.id)}>
                      <button
                        type="submit"
                        className="rounded-xl bg-surface-muted px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98]"
                      >
                        {isMine ? "다시 선택" : "투표"}
                      </button>
                    </form>
                  )}
                  {poll.status === "closed" && isCreator && (
                    <form action={decidePoll.bind(null, poll.id, option.id)}>
                      <button
                        type="submit"
                        className="rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-black transition active:scale-[0.98]"
                      >
                        이 결과로 결정
                      </button>
                    </form>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {poll.status === "closed" && isCreator && winningIds.length > 1 && (
        <section className="rounded-card bg-surface p-4 shadow-card">
          <h2 className="text-base font-bold text-ink">결정 못 하겠어요?</h2>
          <p className="mt-1 text-sm text-ink-muted">공동 1위 중에서 기준을 골라 결과를 확정할 수 있어요.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <form action={resolvePollTie.bind(null, poll.id, "random")}>
              <button type="submit" className={buttonStyles({ variant: "secondary", block: true })}>
                무작위로 결정
              </button>
            </form>
            {poll.pollType === "restaurant" && (
              <>
                <form action={resolvePollTie.bind(null, poll.id, "nearest")}>
                  <button type="submit" className={buttonStyles({ variant: "secondary", block: true })}>
                    가장 가까운 곳
                  </button>
                </form>
                <form action={resolvePollTie.bind(null, poll.id, "least_visited")}>
                  <button type="submit" className={buttonStyles({ variant: "secondary", block: true })}>
                    덜 방문한 곳
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      )}

      {isOpen && canVote && poll.myOptionId && (
        <form action={cancelVote.bind(null, poll.id)}>
          <button type="submit" className={buttonStyles({ variant: "secondary", block: true })}>
            투표 취소
          </button>
        </form>
      )}

      {isOpen && employee && poll.appointmentId && !canVote && (
        <p className="text-sm text-ink-muted">이 약속에서 수락한 참여자만 투표할 수 있어요.</p>
      )}

      {isOpen && isCreator && (
        <form action={closePoll.bind(null, poll.id)}>
          <button type="submit" className="w-full rounded-control bg-surface-muted px-4 py-3 text-sm font-semibold transition active:scale-[0.98]">
            지금 마감하기
          </button>
        </form>
      )}

      {canBridgeToAppointment && (
        <Link
          href={`/appointments/new?restaurantId=${decidedOptionRestaurantId}&fromPollId=${poll.id}`}
          className={buttonStyles({ block: true })}
        >
          이 식당으로 약속 만들기
        </Link>
      )}

      {!employee && (
        <Link
          href={`/login?returnTo=${encodeURIComponent(`/polls/${poll.id}`)}`}
          className={buttonStyles({ block: true })}
        >
          로그인하고 투표하기
        </Link>
      )}
    </main>
  );
}
