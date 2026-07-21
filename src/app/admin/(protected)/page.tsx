import Link from "next/link";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { getOperatingStats } from "@/lib/admin/operating-stats";
import { LogoutButton } from "./LogoutButton";

export default async function AdminDashboardPage() {
  const admin = await getCurrentAdmin();
  const stats = await getOperatingStats(new Date());

  const statCards = [
    { label: "활성 직원 수", value: stats.activeEmployeeCount },
    { label: "이번 달 완료 방문", value: stats.monthlyCompletedVisitCount },
    { label: "이번 달 약속 수", value: stats.monthlyAppointmentCount },
    { label: "이번 달 리뷰 수", value: stats.monthlyReviewCount },
    { label: "미처리 신고 수", value: stats.pendingReportCount },
    { label: "오늘 제보 수", value: stats.todayStatusReportCount },
    { label: "진행 중 투표 수", value: stats.openPollCount },
  ];

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-12">
      <h1 className="text-xl font-bold text-brand-dark">관리자</h1>
      <p className="text-ink">{admin?.email} 님으로 로그인되어 있습니다.</p>

      <section className="grid grid-cols-2 gap-3" aria-label="운영 통계">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-card bg-surface px-4 py-4 shadow-card">
            <p className="text-sm text-ink-muted">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-brand-dark tabular-nums">{stat.value}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-col gap-2">
        <Link href="/admin/restaurants" className="rounded-card bg-surface px-4 py-3 font-semibold text-brand-dark shadow-card">
          식당 관리
        </Link>
        <Link href="/admin/employees" className="rounded-card bg-surface px-4 py-3 font-semibold text-brand-dark shadow-card">
          직원 관리
        </Link>
        <Link href="/admin/reports" className="rounded-card bg-surface px-4 py-3 font-semibold text-brand-dark shadow-card">
          신고 처리
        </Link>
        <Link href="/admin/polls" className="rounded-card bg-surface px-4 py-3 font-semibold text-brand-dark shadow-card">
          투표 상태 확인
        </Link>
        <Link href="/admin/settings" className="rounded-card bg-surface px-4 py-3 font-semibold text-brand-dark shadow-card">
          설정
        </Link>
        <Link href="/admin/logs" className="rounded-card bg-surface px-4 py-3 font-semibold text-brand-dark shadow-card">
          관리자 로그
        </Link>
      </div>

      <LogoutButton />
    </main>
  );
}
