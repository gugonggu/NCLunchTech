import Link from "next/link";
import { getCurrentEmployee } from "@/lib/auth/session";
import { distanceInMeters } from "@/lib/geo";
import { getHomeAppSettings } from "@/lib/app-settings";
import { getActiveVisitToday } from "@/lib/visits/queries";
import { getSeoulDateString, isVisitFeedbackCode, VISIT_STATUS_MESSAGES } from "@/lib/visits/validation";
import { getPublicRecruitingAppointments, getRelevantAppointments } from "@/lib/appointments/queries";
import { getUnreadNotificationCount } from "@/lib/notifications/queries";
import { getMealRecordForSource } from "@/lib/meals/queries";
import { getRelevantPolls } from "@/lib/polls/queries";
import { hasMyReview } from "@/lib/reviews/queries";
import { getLunchAvailabilities } from "@/lib/lunch-availability/queries";
import { getRestaurantOfTheMonth } from "@/lib/restaurant-of-the-month-queries";
import { HomeHero } from "@/components/lunch/HomeHero";
import { LunchAvailabilityCard } from "@/components/lunch/LunchAvailabilityCard";
import { RestaurantOfTheMonthCard } from "@/components/lunch/RestaurantOfTheMonthCard";
import { TodayTimeline } from "@/components/lunch/TodayTimeline";
import { selectHomeHero } from "@/components/lunch/home-state";
import { buttonStyles } from "@/components/ui/Button";
import { GradientBackdrop } from "@/components/ui/GradientBackdrop";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  weekday: "long",
});

const appointmentTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
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
  const [
    todayVisit,
    relevantAppointments,
    publicRecruitingAppointments,
    unreadNotificationCount,
    relevantPolls,
    lunchAvailabilities,
    restaurantOfTheMonth,
    settings,
  ] = await Promise.all([
    getActiveVisitToday(employee.id, today),
    getRelevantAppointments(employee.id, now),
    getPublicRecruitingAppointments(employee.id, now),
    getUnreadNotificationCount(employee.id),
    getRelevantPolls(employee.id),
    getLunchAvailabilities(today),
    getRestaurantOfTheMonth(now),
    getHomeAppSettings(),
  ]);
  const todayMealRecord =
    todayVisit?.status === "completed"
      ? await getMealRecordForSource(employee.id, { visitId: todayVisit.id })
      : null;
  const hasTodayReview = todayVisit ? await hasMyReview(employee.id, todayVisit.restaurantId) : false;

  const soloNeedsConfirmation = todayVisit?.status === "planned";
  const appointmentsNeedingConfirmation = relevantAppointments.filter((appointment) => appointment.needsConfirmation);
  const upcomingAppointments = relevantAppointments.filter((appointment) => !appointment.needsConfirmation);
  const hasAnyConfirmation = soloNeedsConfirmation || appointmentsNeedingConfirmation.length > 0;


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
    <main className="relative flex w-full flex-1 flex-col gap-8 overflow-hidden pb-6 sm:pb-8">
      <GradientBackdrop />

      <header
        className="animate-fade-up mx-auto flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        style={{ animationDelay: "0ms" }}
      >
        <div>
          <p className="text-sm font-semibold text-brand-dark">{dateFormatter.format(now)}</p>
          <h1 className="mt-2 bg-gradient-to-r from-brand-dark via-brand via-[#ff5c7a] to-[#c94b8a] bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-5xl">
            {employee.nickname}님, 안녕하세요.
          </h1>
        </div>
        {unreadNotificationCount > 0 && (
          <Link href="/notifications" className={buttonStyles({ variant: "secondary", size: "compact" })}>
            알림 {unreadNotificationCount}건
          </Link>
        )}
      </header>

      {settings?.announcement && (
        <p
          className="animate-fade-up mx-auto w-full max-w-2xl rounded-control bg-surface px-4 py-3 text-sm text-ink-muted shadow-card"
          style={{ animationDelay: "80ms" }}
        >
          {settings.announcement}
        </p>
      )}

      {feedbackMessage && (
        <p
          className="animate-fade-up mx-auto w-full max-w-2xl rounded-control bg-success-soft px-4 py-3 text-sm font-semibold text-success"
          style={{ animationDelay: "80ms" }}
        >
          {feedbackMessage}
        </p>
      )}

      <div className="animate-fade-up mx-auto w-full max-w-2xl" style={{ animationDelay: "160ms" }}>
        <HomeHero
          kind={heroKind}
          todayVisit={todayVisit}
          todayMealRecord={todayMealRecord}
          hasTodayReview={hasTodayReview}
          soloNeedsConfirmation={soloNeedsConfirmation}
          appointmentsNeedingConfirmation={appointmentsNeedingConfirmation}
          primaryPoll={primaryPoll}
          distanceM={todayVisitDistanceM}
          now={now}
        />
      </div>

      <div className="animate-fade-up mx-auto w-full max-w-2xl" style={{ animationDelay: "190ms" }}>
        <LunchAvailabilityCard employeeId={employee.id} availabilities={lunchAvailabilities} />
      </div>

      {restaurantOfTheMonth && (
        <div className="animate-fade-up mx-auto w-full max-w-2xl" style={{ animationDelay: "205ms" }}>
          <RestaurantOfTheMonthCard restaurant={restaurantOfTheMonth} />
        </div>
      )}

      {publicRecruitingAppointments.length > 0 && (
        <section className="animate-fade-up mx-auto flex w-full max-w-2xl flex-col gap-3" style={{ animationDelay: "210ms" }}>
          <div>
            <p className="text-sm font-semibold text-brand-dark">Open lunch</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-ink">참여 가능한 동행</h2>
          </div>
          <div className="flex flex-col gap-2">
            {publicRecruitingAppointments.map((appointment) => (
              <Link
                key={appointment.id}
                href={`/appointments/${appointment.id}`}
                className="rounded-card bg-surface px-4 py-3 shadow-card transition active:scale-[0.99]"
              >
                <p className="font-semibold text-ink">{appointment.restaurantName}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {appointmentTimeFormatter.format(new Date(appointment.scheduledAt))} · {appointment.acceptedParticipantCount + 1}/{appointment.capacity}명
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <nav
        aria-label="홈 바로가기"
        className="animate-fade-up mx-auto grid w-full max-w-2xl grid-cols-2 gap-3"
        style={{ animationDelay: "220ms" }}
      >
        <Link href="/collection" className={buttonStyles({ variant: "secondary", block: true })}>
          도감
        </Link>
        <Link href="/leaderboard" className={buttonStyles({ variant: "secondary", block: true })}>
          리더보드
        </Link>
      </nav>

      <div className="animate-fade-up mx-auto w-full max-w-2xl" style={{ animationDelay: "280ms" }}>
        <TodayTimeline
          polls={secondaryPolls}
          appointments={upcomingAppointments}
          now={now}
          todayVisit={todayVisit}
          todayMealRecord={todayMealRecord}
          hasTodayReview={hasTodayReview}
          distanceM={todayVisitDistanceM}
          showVisitSummary={showVisitSummary}
        />
      </div>
    </main>
  );
}
