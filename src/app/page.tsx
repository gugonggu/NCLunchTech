import Link from "next/link";
import { getCurrentEmployee } from "@/lib/auth/session";
import { distanceInMeters } from "@/lib/geo";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isPastConfirmationWindow } from "@/lib/confirmation-window";
import { getActiveVisitToday } from "@/lib/visits/queries";
import { getSeoulDateString, isVisitFeedbackCode, VISIT_STATUS_MESSAGES } from "@/lib/visits/validation";
import { getRelevantAppointments } from "@/lib/appointments/queries";
import { getUnreadNotificationCount } from "@/lib/notifications/queries";
import { getMealRecordForSource } from "@/lib/meals/queries";
import { getRelevantPolls } from "@/lib/polls/queries";
import { HomeHero } from "@/components/lunch/HomeHero";
import { TodayTimeline } from "@/components/lunch/TodayTimeline";
import { selectHomeHero } from "@/components/lunch/home-state";
import { buttonStyles } from "@/components/ui/Button";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  weekday: "long",
});

interface HomeSearchParams {
  visitStatus?: string;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const employee = await getCurrentEmployee();

  if (!employee) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-brand-bg px-6 py-12 text-center">
        <h1 className="text-2xl font-bold text-brand-dark">앤시점심기술</h1>
        <p className="text-ink-muted">앤시정보기술 동료들과 점심 메뉴를 정하는 사내 서비스입니다.</p>
        <div className="flex w-full flex-col gap-2">
          <Link href="/login" className="rounded-control bg-brand px-4 py-3 text-center font-semibold text-black">
            로그인
          </Link>
          <Link
            href="/signup"
            className="rounded-control bg-surface px-4 py-3 text-center font-semibold text-brand-dark shadow-card"
          >
            회원가입
          </Link>
        </div>
      </main>
    );
  }

  const rawParams = await searchParams;
  const feedbackMessage = isVisitFeedbackCode(rawParams.visitStatus)
    ? VISIT_STATUS_MESSAGES[rawParams.visitStatus]
    : null;

  const now = new Date();
  const today = getSeoulDateString(now);
  const todayVisit = await getActiveVisitToday(employee.id, today);
  const todayMealRecord =
    todayVisit?.status === "completed"
      ? await getMealRecordForSource(employee.id, { visitId: todayVisit.id })
      : null;
  const relevantAppointments = await getRelevantAppointments(employee.id, now);
  const unreadNotificationCount = await getUnreadNotificationCount(employee.id);
  const relevantPolls = await getRelevantPolls(employee.id);

  const soloNeedsConfirmation =
    todayVisit?.status === "planned" && isPastConfirmationWindow(new Date(todayVisit.updatedAt), now);
  const appointmentsNeedingConfirmation = relevantAppointments.filter((appointment) => appointment.needsConfirmation);
  const upcomingAppointments = relevantAppointments.filter((appointment) => !appointment.needsConfirmation);
  const hasAnyConfirmation = soloNeedsConfirmation || appointmentsNeedingConfirmation.length > 0;

  const supabase = createServiceRoleClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("company_lat, company_lng, announcement")
    .eq("id", 1)
    .maybeSingle();

  let todayVisitDistanceM: number | null = null;
  if (todayVisit && settings?.company_lat && settings?.company_lng) {
    todayVisitDistanceM = Math.round(
      distanceInMeters(
        { lat: settings.company_lat, lng: settings.company_lng },
        { lat: todayVisit.restaurantLat, lng: todayVisit.restaurantLng },
      ),
    );
  }

  const heroKind = selectHomeHero({
    needsConfirmation: hasAnyConfirmation,
    needsPollResponse: relevantPolls.some((poll) => poll.status === "open"),
    hasPlannedLunch: todayVisit?.status === "planned",
    hasCompletedLunch: todayVisit?.status === "completed",
  });
  const primaryPoll = heroKind === "poll" ? (relevantPolls.find((poll) => poll.status === "open") ?? null) : null;
  const secondaryPolls = primaryPoll ? relevantPolls.filter((poll) => poll.id !== primaryPoll.id) : relevantPolls;
  const showVisitSummary =
    todayVisit !== null &&
    heroKind !== "decision" &&
    heroKind !== "follow-up" &&
    !(heroKind === "confirmation" && soloNeedsConfirmation);

  return (
    <main className="flex w-full flex-1 flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-dark">{dateFormatter.format(now)}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{employee.nickname}님, 안녕하세요.</h1>
        </div>
        {unreadNotificationCount > 0 && (
          <Link href="/notifications" className={buttonStyles({ variant: "secondary", size: "compact" })}>
            알림 {unreadNotificationCount}건
          </Link>
        )}
      </header>

      {settings?.announcement && (
        <p className="rounded-control bg-surface px-4 py-3 text-sm text-ink-muted shadow-card">
          {settings.announcement}
        </p>
      )}

      {feedbackMessage && (
        <p className="rounded-control bg-success-soft px-4 py-3 text-sm font-semibold text-success">{feedbackMessage}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:gap-8">
        <HomeHero
          kind={heroKind}
          todayVisit={todayVisit}
          todayMealRecord={todayMealRecord}
          soloNeedsConfirmation={soloNeedsConfirmation}
          appointmentsNeedingConfirmation={appointmentsNeedingConfirmation}
          primaryPoll={primaryPoll}
          distanceM={todayVisitDistanceM}
          now={now}
        />
        <TodayTimeline
          polls={secondaryPolls}
          appointments={upcomingAppointments}
          now={now}
          todayVisit={todayVisit}
          todayMealRecord={todayMealRecord}
          distanceM={todayVisitDistanceM}
          showVisitSummary={showVisitSummary}
        />
      </div>

      <nav aria-label="홈 바로가기" className="grid grid-cols-2 gap-3">
        <Link href="/restaurants" className={buttonStyles({ variant: "secondary", block: true })}>
          식당 찾기
        </Link>
        <Link href="/collection" className={buttonStyles({ variant: "secondary", block: true })}>
          도감
        </Link>
      </nav>
    </main>
  );
}
