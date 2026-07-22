import Link from "next/link";
import { cancelTodayVisit, completeTodayVisit } from "@/app/visits/actions";
import type { RelevantAppointment } from "@/lib/appointments/queries";
import type { MealRecord } from "@/lib/meals/queries";
import type { RelevantPoll } from "@/lib/polls/queries";
import { isClosingSoon } from "@/lib/polls/validation";
import type { ActiveVisit } from "@/lib/visits/queries";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const upcomingFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

interface TodayTimelineProps {
  polls: RelevantPoll[];
  appointments: RelevantAppointment[];
  now: Date;
  todayVisit: ActiveVisit | null;
  todayMealRecord: MealRecord | null;
  distanceM: number | null;
  showVisitSummary: boolean;
}

export function TodayTimeline({
  polls,
  appointments,
  now,
  todayVisit,
  todayMealRecord,
  distanceM,
  showVisitSummary,
}: TodayTimelineProps) {
  const hasItems = (showVisitSummary && todayVisit !== null) || polls.length > 0 || appointments.length > 0;

  return (
    <section aria-label="오늘 일정" className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-brand-dark">Today</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-ink sm:text-2xl">오늘 일정</h2>
      </div>

      {showVisitSummary && todayVisit?.status === "planned" && (
        <Card>
          <p className="text-xs font-semibold text-brand-dark">오늘의 점심</p>
          <p className="mt-1 font-semibold text-ink">{todayVisit.restaurantName}</p>
          <p className="text-sm tabular-nums text-ink-muted">
            {todayVisit.restaurantCategory}
            {distanceM !== null && ` · ${distanceM}m`}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href={`/restaurants/${todayVisit.restaurantId}`}
              className={buttonStyles({ variant: "ghost", size: "compact", block: true })}
            >
              상세 보기
            </Link>
            <Link
              href="/recommend"
              className={buttonStyles({ variant: "ghost", size: "compact", block: true })}
            >
              변경하기
            </Link>
            <form action={cancelTodayVisit}>
              <Button type="submit" variant="ghost" size="compact" block>
                결정 취소
              </Button>
            </form>
            <form action={completeTodayVisit}>
              <Button type="submit" variant="secondary" size="compact" block>
                방문 완료
              </Button>
            </form>
          </div>
        </Card>
      )}

      {showVisitSummary && todayVisit?.status === "completed" && (
        <Card>
          <p className="text-xs font-semibold text-success">오늘 다녀온 식당 · 방문 완료</p>
          <p className="mt-1 font-semibold text-ink">{todayVisit.restaurantName}</p>
          <p className="text-sm tabular-nums text-ink-muted">
            {todayVisit.restaurantCategory}
            {distanceM !== null && ` · ${distanceM}m`}
          </p>
          {todayMealRecord && (
            <p className="mt-1 text-sm tabular-nums text-ink-muted">
              {todayMealRecord.menuName} · {todayMealRecord.paidPrice.toLocaleString("ko-KR")}원
            </p>
          )}
          <Link
            href={`/reviews/new?restaurantId=${todayVisit.restaurantId}&visitId=${todayVisit.id}`}
            className={`${buttonStyles({ variant: "ghost", size: "compact" })} mt-2`}
          >
            리뷰 남기기
          </Link>
        </Card>
      )}

      {polls.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-ink-muted">진행 중인 투표</h3>
          {polls.map((poll) => (
            <Link
              key={poll.id}
              href={`/polls/${poll.id}`}
              className="rounded-control bg-surface px-4 py-4 shadow-card transition active:scale-[0.98]"
            >
              <span className="block font-semibold text-ink">{poll.label}</span>
              <span className="block text-sm text-ink-muted">
                {poll.status === "open" ? "진행 중" : "마감됨 · 결과 확정 대기"}
                {poll.status === "open" && isClosingSoon(new Date(poll.closesAt), now) && " · 마감 임박"}
              </span>
            </Link>
          ))}
        </div>
      )}

      {appointments.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-ink-muted">다가오는 약속</h3>
          {appointments.map((appointment) => (
            <Link
              key={appointment.id}
              href={`/appointments/${appointment.id}`}
              className="rounded-control bg-surface px-4 py-4 shadow-card transition active:scale-[0.98]"
            >
              <span className="block font-semibold text-ink">{appointment.restaurantName}</span>
              <span className="block text-sm text-ink-muted">
                {upcomingFormatter.format(new Date(appointment.scheduledAt))}
                {appointment.role === "host"
                  ? " · 내가 만든 약속"
                  : appointment.participantStatus === "pending"
                    ? " · 응답 대기 중"
                    : " · 참여 확정"}
              </span>
            </Link>
          ))}
        </div>
      )}

      {!hasItems && <p className="rounded-control bg-surface-muted px-4 py-3 text-sm text-ink-muted">추가 일정이 없어요.</p>}
    </section>
  );
}
