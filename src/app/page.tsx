import Link from "next/link";
import { getCurrentEmployee } from "@/lib/auth/session";
import { distanceInMeters } from "@/lib/geo";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isPastConfirmationWindow } from "@/lib/confirmation-window";
import { cancelTodayVisit, completeTodayVisit } from "@/app/visits/actions";
import { getActiveVisitToday } from "@/lib/visits/queries";
import { getSeoulDateString, isVisitFeedbackCode, VISIT_STATUS_MESSAGES } from "@/lib/visits/validation";
import { getRelevantAppointments } from "@/lib/appointments/queries";
import { getUnreadNotificationCount } from "@/lib/notifications/queries";
import { LogoutButton } from "./LogoutButton";

const upcomingFormatter = new Intl.DateTimeFormat("ko-KR", {
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
        <p className="text-neutral-700">
          앤시정보기술 동료들과 점심 메뉴를 정하는 사내 서비스입니다.
        </p>
        <div className="flex w-full flex-col gap-2">
          <Link
            href="/login"
            className="rounded-2xl bg-brand px-4 py-3 text-center font-semibold text-white"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="rounded-2xl bg-white px-4 py-3 text-center font-semibold text-brand-dark shadow-sm"
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
  const relevantAppointments = await getRelevantAppointments(employee.id, now);
  const unreadNotificationCount = await getUnreadNotificationCount(employee.id);

  const soloNeedsConfirmation =
    todayVisit?.status === "planned" && isPastConfirmationWindow(new Date(todayVisit.updatedAt), now);
  const appointmentsNeedingConfirmation = relevantAppointments.filter((a) => a.needsConfirmation);
  const upcomingAppointments = relevantAppointments.filter((a) => !a.needsConfirmation);
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
        { lat: todayVisit.restaurantLat, lng: todayVisit.restaurantLng }
      )
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-brand-bg px-6 py-12 text-center">
      <h1 className="text-2xl font-bold text-brand-dark">앤시점심기술</h1>

      {settings?.announcement && (
        <p className="w-full rounded-2xl bg-white px-4 py-3 text-sm text-neutral-700 shadow-sm">
          {settings.announcement}
        </p>
      )}

      {unreadNotificationCount > 0 && (
        <Link
          href="/notifications"
          className="w-full rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-brand-dark shadow-sm"
        >
          알림 {unreadNotificationCount}건
        </Link>
      )}

      <p className="text-neutral-700">{employee.nickname}님, 안녕하세요.</p>

      {feedbackMessage && (
        <p className="w-full rounded-2xl bg-white px-4 py-3 text-sm text-brand-dark shadow-sm">
          {feedbackMessage}
        </p>
      )}

      {hasAnyConfirmation && (
        <div className="flex w-full flex-col gap-2 text-left">
          <p className="text-sm font-semibold text-neutral-500">방문 확인</p>

          {soloNeedsConfirmation && todayVisit && (
            <div className="rounded-2xl border-2 border-brand bg-white px-4 py-4">
              <p className="font-semibold">{todayVisit.restaurantName}</p>
              <p className="text-sm text-neutral-500">{todayVisit.restaurantCategory}</p>
              <div className="mt-3 flex gap-2">
                <form action={completeTodayVisit} className="flex-1">
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white"
                  >
                    다녀왔어요
                  </button>
                </form>
                <form action={cancelTodayVisit} className="flex-1">
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-600"
                  >
                    가지 않았어요
                  </button>
                </form>
              </div>
            </div>
          )}

          {appointmentsNeedingConfirmation.map((a) => (
            <Link
              key={a.id}
              href={`/appointments/${a.id}`}
              className="rounded-2xl border-2 border-brand bg-white px-4 py-3"
            >
              <p className="font-semibold">{a.restaurantName}</p>
              <p className="text-sm text-neutral-500">
                {upcomingFormatter.format(new Date(a.scheduledAt))} · 방문 확인하기
              </p>
            </Link>
          ))}
        </div>
      )}

      {todayVisit?.status === "planned" && !soloNeedsConfirmation && (
        <div className="w-full rounded-2xl border-2 border-brand bg-white px-4 py-4 text-left">
          <p className="text-sm text-neutral-500">오늘의 점심</p>
          <p className="text-lg font-bold text-brand-dark">{todayVisit.restaurantName}</p>
          <p className="text-sm text-neutral-500">
            {todayVisit.restaurantCategory}
            {todayVisitDistanceM !== null && ` · ${todayVisitDistanceM}m`}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href={`/restaurants/${todayVisit.restaurantId}`}
              className="rounded-xl bg-neutral-100 px-3 py-2 text-center text-sm font-semibold"
            >
              상세 보기
            </Link>
            <Link
              href="/recommend"
              className="rounded-xl bg-neutral-100 px-3 py-2 text-center text-sm font-semibold"
            >
              변경하기
            </Link>
            <div className="flex gap-2">
              <form action={cancelTodayVisit} className="flex-1">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-600"
                >
                  결정 취소
                </button>
              </form>
              <form action={completeTodayVisit} className="flex-1">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white"
                >
                  방문 완료
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {todayVisit?.status === "completed" && (
        <div className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-left">
          <p className="text-sm text-neutral-500">오늘 다녀온 식당</p>
          <p className="text-lg font-bold text-brand-dark">{todayVisit.restaurantName}</p>
          <p className="text-sm text-neutral-500">
            {todayVisit.restaurantCategory}
            {todayVisitDistanceM !== null && ` · ${todayVisitDistanceM}m`}
          </p>
          <p className="mt-2 text-sm text-brand-dark">방문 완료</p>
          <Link
            href={`/reviews/new?restaurantId=${todayVisit.restaurantId}`}
            className="mt-3 block rounded-xl bg-neutral-100 px-3 py-2 text-center text-sm font-semibold"
          >
            리뷰 남기기
          </Link>
        </div>
      )}

      {!todayVisit && (
        <div className="flex w-full flex-col gap-2">
          <Link
            href="/recommend"
            className="rounded-2xl bg-brand px-4 py-3 text-center font-semibold text-white"
          >
            오늘 뭐 먹지?
          </Link>
          <Link
            href="/restaurants"
            className="rounded-2xl bg-white px-4 py-3 text-center font-semibold text-brand-dark shadow-sm"
          >
            식당 찾기
          </Link>
          <Link
            href="/collection"
            className="rounded-2xl bg-white px-4 py-3 text-center font-semibold text-brand-dark shadow-sm"
          >
            도감
          </Link>
        </div>
      )}

      {upcomingAppointments.length > 0 && (
        <div className="flex w-full flex-col gap-2 text-left">
          <p className="text-sm font-semibold text-neutral-500">다가오는 약속</p>
          {upcomingAppointments.map((a) => (
            <Link
              key={a.id}
              href={`/appointments/${a.id}`}
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-3"
            >
              <p className="font-semibold">{a.restaurantName}</p>
              <p className="text-sm text-neutral-500">
                {upcomingFormatter.format(new Date(a.scheduledAt))}
                {a.role === "host"
                  ? " · 내가 만든 약속"
                  : a.participantStatus === "pending"
                    ? " · 응답 대기 중"
                    : " · 참여 확정"}
              </p>
            </Link>
          ))}
        </div>
      )}

      {todayVisit && (
        <>
          <Link
            href="/restaurants"
            className="w-full rounded-2xl bg-white px-4 py-3 text-center font-semibold text-brand-dark shadow-sm"
          >
            식당 찾기
          </Link>
          <Link
            href="/collection"
            className="w-full rounded-2xl bg-white px-4 py-3 text-center font-semibold text-brand-dark shadow-sm"
          >
            도감
          </Link>
        </>
      )}

      <LogoutButton />
    </main>
  );
}
