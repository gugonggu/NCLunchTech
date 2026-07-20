import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { LogoutButton } from "../LogoutButton";

const joinedAtFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default async function MePage() {
  const employee = await getCurrentEmployee();
  if (!employee) redirect("/login?returnTo=%2Fme");

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
    supabase.from("employees").select("created_at").eq("id", employee.id).maybeSingle(),
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
    throw new Error("내 정보 조회에 실패했습니다.");
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

  return (
    <main className="flex flex-1 flex-col gap-5 bg-brand-bg px-6 py-8">
      <div>
        <p className="text-sm text-neutral-500">내 정보</p>
        <h1 className="mt-1 text-2xl font-bold text-brand-dark">{employee.nickname}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {joinedAtFormatter.format(new Date(profileResult.data.created_at))} 가입
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3" aria-label="활동 통계">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-white px-4 py-4 shadow-sm">
            <p className="text-sm text-neutral-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-brand-dark">{stat.value}</p>
          </div>
        ))}
      </section>

      <Link
        href="/notifications"
        className="rounded-2xl bg-white px-4 py-4 font-semibold text-brand-dark shadow-sm"
      >
        알림 보기
      </Link>

      <Link
        href="/leaderboard"
        className="rounded-2xl bg-white px-4 py-4 font-semibold text-brand-dark shadow-sm"
      >
        월간 배지·리더보드
      </Link>

      <LogoutButton />
    </main>
  );
}
