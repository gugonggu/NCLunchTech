import Link from "next/link";
import { cancelTodayVisit, completeTodayVisit, markTodayVisitNoShow } from "@/app/visits/actions";
import type { RelevantAppointment } from "@/lib/appointments/queries";
import type { MealRecord } from "@/lib/meals/queries";
import type { RelevantPoll } from "@/lib/polls/queries";
import type { ActiveVisit } from "@/lib/visits/queries";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { isClosingSoon } from "@/lib/polls/validation";
import type { HomeHeroKind } from "./home-state";

const appointmentFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

interface HomeHeroProps {
  kind: HomeHeroKind;
  todayVisit: ActiveVisit | null;
  todayMealRecord: MealRecord | null;
  soloNeedsConfirmation: boolean;
  appointmentsNeedingConfirmation: RelevantAppointment[];
  primaryPoll: RelevantPoll | null;
  distanceM: number | null;
  now: Date;
}

function VisitMeta({ visit, distanceM }: { visit: ActiveVisit; distanceM: number | null }) {
  return (
    <p className="mt-1 text-sm text-ink-muted">
      {visit.restaurantCategory}
      {distanceM !== null && ` · ${distanceM}m`}
    </p>
  );
}

export function HomeHero({
  kind,
  todayVisit,
  todayMealRecord,
  soloNeedsConfirmation,
  appointmentsNeedingConfirmation,
  primaryPoll,
  distanceM,
  now,
}: HomeHeroProps) {
  return (
    <section aria-label="오늘 가장 중요한 일">
      <Card tone="accent" className="h-full overflow-hidden">
        {kind === "confirmation" && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-brand-dark">방문 확인</p>
              <h2 className="mt-1 text-2xl font-bold text-ink">오늘 점심은 어떠셨나요?</h2>
            </div>

            {soloNeedsConfirmation && todayVisit && (
              <div className="rounded-control bg-surface p-4">
                <p className="font-semibold text-ink">{todayVisit.restaurantName}</p>
                <VisitMeta visit={todayVisit} distanceM={distanceM} />
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <form action={completeTodayVisit}>
                    <Button type="submit" size="compact" block>
                      다녀왔어요
                    </Button>
                  </form>
                  <form action={markTodayVisitNoShow}>
                    <Button type="submit" variant="secondary" size="compact" block>
                      가지 않았어요
                    </Button>
                  </form>
                </div>
              </div>
            )}

            {appointmentsNeedingConfirmation.map((appointment) => (
              <Link
                key={appointment.id}
                href={`/appointments/${appointment.id}`}
                className={buttonStyles({ variant: "secondary", block: true })}
              >
                <span className="min-w-0 text-left">
                  <span className="block font-semibold">{appointment.restaurantName}</span>
                  <span className="block text-xs font-normal text-ink-muted">
                    {appointmentFormatter.format(new Date(appointment.scheduledAt))} · 방문 확인하기
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}

        {kind === "poll" && primaryPoll && (
          <div>
            <p className="text-sm font-semibold text-brand-dark">진행 중인 투표</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">{primaryPoll.label}</h2>
            <p className="mt-2 text-sm text-ink-muted">
              선택지를 확인하고 동료들과 오늘 점심을 정해보세요.
              {isClosingSoon(new Date(primaryPoll.closesAt), now) && " · 마감 임박"}
            </p>
            <Link
              href={`/polls/${primaryPoll.id}`}
              aria-label={`${primaryPoll.label} 투표 보러 가기`}
              className={`${buttonStyles()} mt-5 w-full`}
            >
              투표 보러 가기
            </Link>
          </div>
        )}

        {kind === "decision" && todayVisit && (
          <div>
            <p className="text-sm font-semibold text-brand-dark">오늘의 점심</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">{todayVisit.restaurantName}</h2>
            <VisitMeta visit={todayVisit} distanceM={distanceM} />
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link
                href={`/restaurants/${todayVisit.restaurantId}`}
                className={buttonStyles({ variant: "secondary", block: true })}
              >
                상세 보기
              </Link>
              <Link href="/recommend" className={buttonStyles({ variant: "secondary", block: true })}>
                변경하기
              </Link>
              <form action={cancelTodayVisit}>
                <Button type="submit" variant="ghost" size="compact" block>
                  결정 취소
                </Button>
              </form>
              <form action={completeTodayVisit}>
                <Button type="submit" size="compact" block>
                  방문 완료
                </Button>
              </form>
            </div>
          </div>
        )}

        {kind === "follow-up" && todayVisit && (
          <div>
            <p className="text-sm font-semibold text-brand-dark">오늘 다녀온 식당</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">{todayVisit.restaurantName}</h2>
            <VisitMeta visit={todayVisit} distanceM={distanceM} />
            <p className="mt-3 text-sm font-semibold text-success">방문 완료</p>
            {todayMealRecord && (
              <p className="mt-1 text-sm text-ink-muted">
                {todayMealRecord.menuName} · {todayMealRecord.paidPrice.toLocaleString("ko-KR")}원
              </p>
            )}
            <Link
              href={`/reviews/new?restaurantId=${todayVisit.restaurantId}&visitId=${todayVisit.id}`}
              className={`${buttonStyles()} mt-5 w-full`}
            >
              리뷰 남기기
            </Link>
          </div>
        )}

        {kind === "recommend" && (
          <div>
            <p className="text-sm font-semibold text-brand-dark">오늘의 추천</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">오늘 점심, 가볍게 골라볼까요?</h2>
            <p className="mt-2 text-sm text-ink-muted">거리와 취향을 반영한 추천을 바로 받아보세요.</p>
            <Link href="/recommend" className={`${buttonStyles()} mt-5 w-full`}>
              오늘 뭐 먹지?
            </Link>
          </div>
        )}
      </Card>
    </section>
  );
}
