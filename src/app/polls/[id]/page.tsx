import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { getPollDetail, getWinningIds, isEligibleAppointmentVoter } from "@/lib/polls/queries";
import { POLL_STATUS_MESSAGES, isPollStatusCode, isValidRestaurantPollBridge } from "@/lib/polls/validation";
import { cancelVote, closePoll, decidePoll, voteInPoll } from "./actions";

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
    <main className="flex flex-1 flex-col gap-4 px-6 py-8">
      <Link href="/" className="text-sm text-neutral-500">
        ← 홈으로
      </Link>

      <h1 className="text-xl font-bold text-brand-dark">
        {poll.pollType === "restaurant" ? "식당 투표" : "메뉴 투표"}
      </h1>
      {poll.pollType === "menu" && poll.restaurantName && (
        <p className="text-neutral-700">{poll.restaurantName}</p>
      )}
      {poll.appointmentId && (
        <Link href={`/appointments/${poll.appointmentId}`} className="text-sm text-neutral-500 underline">
          연결된 약속 보기
        </Link>
      )}

      {feedbackMessage && (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm text-brand-dark shadow-sm">{feedbackMessage}</p>
      )}

      <p className="text-sm text-neutral-500">
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
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                  isDecided ? "border-brand bg-brand-bg" : isMine ? "border-brand" : "border-neutral-200"
                }`}
              >
                <span>
                  {option.label}
                  {isMine && <span className="ml-2 text-xs text-brand-dark">내 선택</span>}
                  {isDecided && <span className="ml-2 text-xs font-semibold text-brand-dark">결정됨</span>}
                  {!isDecided && poll.status !== "open" && isWinning && (
                    <span className="ml-2 text-xs text-neutral-500">공동 1위</span>
                  )}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-sm text-neutral-500">{option.voteCount}표</span>
                  {isOpen && canVote && (
                    <form action={voteInPoll.bind(null, poll.id, option.id)}>
                      <button type="submit" className="rounded-xl bg-neutral-100 px-3 py-1.5 text-xs font-semibold">
                        {isMine ? "다시 선택" : "투표"}
                      </button>
                    </form>
                  )}
                  {poll.status === "closed" && isCreator && (
                    <form action={decidePoll.bind(null, poll.id, option.id)}>
                      <button
                        type="submit"
                        className="rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-white"
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

      {isOpen && canVote && poll.myOptionId && (
        <form action={cancelVote.bind(null, poll.id)}>
          <button
            type="submit"
            className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-neutral-600 shadow-sm"
          >
            투표 취소
          </button>
        </form>
      )}

      {isOpen && employee && poll.appointmentId && !canVote && (
        <p className="text-sm text-neutral-500">이 약속에서 수락한 참여자만 투표할 수 있어요.</p>
      )}

      {isOpen && isCreator && (
        <form action={closePoll.bind(null, poll.id)}>
          <button type="submit" className="w-full rounded-2xl bg-neutral-100 px-4 py-3 text-sm font-semibold">
            지금 마감하기
          </button>
        </form>
      )}

      {canBridgeToAppointment && (
        <Link
          href={`/appointments/new?restaurantId=${decidedOptionRestaurantId}&fromPollId=${poll.id}`}
          className="rounded-2xl bg-brand px-4 py-3 text-center font-semibold text-white"
        >
          이 식당으로 약속 만들기
        </Link>
      )}

      {!employee && (
        <Link
          href={`/login?returnTo=${encodeURIComponent(`/polls/${poll.id}`)}`}
          className="rounded-2xl bg-brand px-4 py-3 text-center font-semibold text-white"
        >
          로그인하고 투표하기
        </Link>
      )}
    </main>
  );
}
