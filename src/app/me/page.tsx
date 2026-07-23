import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonStyles } from "@/components/ui/Button";
import { GradientBackdrop, GRADIENT_TEXT } from "@/components/ui/GradientBackdrop";
import { getCurrentEmployee } from "@/lib/auth/session";
import { getMonthlyLeaderboard } from "@/lib/leaderboard-queries";
import { getMonthlySummary } from "@/lib/monthly-summary-queries";
import { getSeasonalBadges } from "@/lib/seasonal-badges-queries";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getMealRecordsForEmployee } from "@/lib/meals/queries";
import { MealRecordList } from "@/components/me/MealRecordList";
import { LogoutButton } from "../LogoutButton";
import { updateMyProfile } from "./actions";

const RANK_CATEGORY_LABELS = {
  review: "리뷰왕",
  explorer: "점심 개척자",
  menu: "메뉴 수집가",
} as const;

const joinedAtFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const PROFILE_STATUS_MESSAGES = {
  profile_updated: "프로필을 저장했어요.",
  profile_invalid: "실명과 닉네임을 다시 확인해주세요.",
  nickname_taken: "이미 사용 중인 닉네임입니다.",
} as const;

const MEAL_STATUS_MESSAGES = {
  saved: "식사 기록을 저장했어요.",
  deleted: "식사 기록을 삭제했어요.",
  not_found: "식사 기록을 찾을 수 없어요.",
} as const;

export default async function MePage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; mealStatus?: string }>;
}) {
  const employee = await getCurrentEmployee();
  if (!employee) redirect("/login?returnTo=%2Fme");

  const params = await searchParams;
  const profileStatus =
    params?.status && Object.hasOwn(PROFILE_STATUS_MESSAGES, params.status)
      ? PROFILE_STATUS_MESSAGES[params.status as keyof typeof PROFILE_STATUS_MESSAGES]
      : null;
  const mealStatus =
    params?.mealStatus && Object.hasOwn(MEAL_STATUS_MESSAGES, params.mealStatus)
      ? MEAL_STATUS_MESSAGES[params.mealStatus as keyof typeof MEAL_STATUS_MESSAGES]
      : null;

  const supabase = createServiceRoleClient();
  const [
    profileResult,
    soloVisitsResult,
    hostedVisitsResult,
    participantVisitsResult,
    hostedAppointmentsResult,
    joinedAppointmentsResult,
    reviewsResult,
    favoritesResult,
  ] = await Promise.all([
    supabase.from("employees").select("created_at, real_name").eq("id", employee.id).maybeSingle(),
    supabase
      .from("visits")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", employee.id)
      .eq("status", "completed"),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("host_employee_id", employee.id)
      .eq("host_attendance_status", "completed"),
    supabase
      .from("appointment_participants")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", employee.id)
      .eq("status", "completed"),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("host_employee_id", employee.id)
      .eq("status", "active"),
    supabase
      .from("appointment_participants")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", employee.id)
      .in("status", ["accepted", "completed"]),
    supabase.from("reviews").select("*", { count: "exact", head: true }).eq("employee_id", employee.id),
    supabase.from("favorites").select("*", { count: "exact", head: true }).eq("employee_id", employee.id),
  ]);

  const results = [
    profileResult,
    soloVisitsResult,
    hostedVisitsResult,
    participantVisitsResult,
    hostedAppointmentsResult,
    joinedAppointmentsResult,
    reviewsResult,
    favoritesResult,
  ];
  if (results.some((result) => result.error) || !profileResult.data) {
    return (
      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 overflow-hidden px-6 py-8">
        <GradientBackdrop />
        <p className="text-sm text-danger">내 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
        <LogoutButton />
      </main>
    );
  }

  const stats = [
    {
      label: "완료 방문",
      value: (soloVisitsResult.count ?? 0) + (hostedVisitsResult.count ?? 0) + (participantVisitsResult.count ?? 0),
    },
    {
      label: "약속 참여",
      value: (hostedAppointmentsResult.count ?? 0) + (joinedAppointmentsResult.count ?? 0),
    },
    { label: "리뷰", value: reviewsResult.count ?? 0 },
    { label: "즐겨찾기", value: favoritesResult.count ?? 0 },
  ];

  const [leaderboard, monthlySummary, seasonalBadges, mealRecords] = await Promise.all([
    getMonthlyLeaderboard(employee.id),
    getMonthlySummary(employee.id),
    getSeasonalBadges(employee.id),
    getMealRecordsForEmployee(employee.id),
  ]);
  const myRanks = (Object.entries(RANK_CATEGORY_LABELS) as [keyof typeof RANK_CATEGORY_LABELS, string][])
    .map(([key, label]) => ({ label, myRank: leaderboard.categories[key].myRank }))
    .filter((row) => row.myRank !== null);

  const realName = profileResult.data.real_name ?? employee.realName ?? "";

  return (
    <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 overflow-hidden px-6 py-8">
      <GradientBackdrop />
      <div>
        <p className="text-sm text-ink-muted">내 정보</p>
        <h1 className={`mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl ${GRADIENT_TEXT}`}>
          {employee.nickname}
        </h1>
        <p className="mt-1 text-sm tabular-nums text-ink-muted">
          {joinedAtFormatter.format(new Date(profileResult.data.created_at))} 가입
        </p>
      </div>

      <section className="rounded-card bg-surface px-4 py-4 shadow-card" aria-label="프로필 수정">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink">프로필</h2>
            <p className="mt-1 text-sm text-ink-muted">리뷰에는 닉네임만 보이고, 초대 검색에는 실명도 사용할 수 있어요.</p>
          </div>
          {profileStatus && (
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-dark">
              {profileStatus}
            </span>
          )}
        </div>
        <form action={updateMyProfile} className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-semibold text-ink">
            실명
            <input
              name="realName"
              defaultValue={realName}
              className="rounded-control border border-line bg-surface px-3 py-3 font-normal text-ink"
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-ink">
            닉네임
            <input
              name="nickname"
              defaultValue={employee.nickname}
              className="rounded-control border border-line bg-surface px-3 py-3 font-normal text-ink"
              required
            />
          </label>
          <button
            type="submit"
            className="rounded-control bg-brand px-4 py-3 text-sm font-bold text-white shadow-card"
          >
            프로필 저장
          </button>
        </form>
      </section>

      <section className="grid grid-cols-2 gap-3" aria-label="활동 통계">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-card bg-surface px-4 py-4 shadow-card">
            <p className="text-sm text-ink-muted">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-brand-dark">{stat.value}</p>
          </div>
        ))}
      </section>

      {mealStatus && (
        <p className="rounded-control bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-dark">{mealStatus}</p>
      )}
      <MealRecordList records={mealRecords} />

      <Link href="/notifications" className={buttonStyles({ variant: "secondary", block: true })}>
        알림 보기
      </Link>

      <section className="rounded-card bg-surface px-4 py-4 shadow-card" aria-label="이번 달 점심 결산">
        <p className="text-sm font-semibold text-brand-dark">{monthlySummary.label} 점심 결산</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-ink-muted">
          <p>
            완료 방문 <strong className="text-brand-dark">{monthlySummary.completedVisitCount}</strong>회
          </p>
          <p>
            새 식당 <strong className="text-brand-dark">{monthlySummary.newRestaurantCount}</strong>곳
          </p>
          <p>
            리뷰 <strong className="text-brand-dark">{monthlySummary.reviewCount}</strong>개
          </p>
          <p>
            메뉴 기록 <strong className="text-brand-dark">{monthlySummary.mealRecordCount}</strong>개
          </p>
        </div>
        {monthlySummary.mostVisitedRestaurant && (
          <p className="mt-3 text-sm text-ink-muted">
            가장 자주 간 곳 ·{" "}
            <span className="font-semibold text-ink">{monthlySummary.mostVisitedRestaurant.name}</span>{" "}
            {monthlySummary.mostVisitedRestaurant.count}회
          </p>
        )}
        {monthlySummary.badges.length > 0 && (
          <p className="mt-3 text-sm text-ink-muted">
            이번 달 배지 · <span className="font-semibold text-brand-dark">{monthlySummary.badges.join(" · ")}</span>
          </p>
        )}
      </section>

      {myRanks.length > 0 && (
        <section className="rounded-card bg-surface px-4 py-4 shadow-card" aria-label="이번 달 내 순위">
          <p className="text-sm font-semibold text-ink-muted">{leaderboard.label} 내 순위</p>
          <ul className="mt-2 flex flex-col gap-1">
            {myRanks.map((row) => (
              <li key={row.label} className="flex items-center justify-between text-sm text-ink">
                <span>{row.label}</span>
                <span className="font-semibold tabular-nums text-brand-dark">
                  {row.myRank!.rank}위 ({row.myRank!.score})
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {seasonalBadges.badges.length > 0 && (
        <section className="rounded-card bg-surface px-4 py-4 shadow-card">
          <p className="text-sm font-semibold text-brand-dark">{seasonalBadges.label} 배지</p>
          <p className="mt-2 text-sm text-ink-muted">{seasonalBadges.badges.join(" · ")}</p>
        </section>
      )}

      <Link href="/leaderboard" className={buttonStyles({ variant: "secondary", block: true })}>
        월간 배지·리더보드
      </Link>

      <LogoutButton />
    </main>
  );
}
