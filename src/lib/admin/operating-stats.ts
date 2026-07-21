import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getSeoulMonthRange } from "@/lib/leaderboard";
import { countTodayStatusReports } from "@/lib/status-reports/queries";

export interface OperatingStats {
  activeEmployeeCount: number;
  monthlyCompletedVisitCount: number;
  monthlyAppointmentCount: number;
  monthlyReviewCount: number;
  pendingReportCount: number;
  todayStatusReportCount: number;
  openPollCount: number;
}

/** 관리자 홈에 표시할 운영 통계. 별도 집계 테이블 없이 조회 시점에 계산한다(스펙 15절 원칙). */
export async function getOperatingStats(now: Date): Promise<OperatingStats> {
  const supabase = createServiceRoleClient();
  const range = getSeoulMonthRange(now);

  const [
    activeEmployees,
    soloVisits,
    hostedVisits,
    participantVisits,
    appointments,
    reviews,
    pendingReports,
    todayStatusReportCount,
    openPolls,
  ] = await Promise.all([
    supabase.from("employees").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("visits")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("visit_date", range.startDate)
      .lt("visit_date", range.endDate),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("host_attendance_status", "completed")
      .gte("scheduled_at", range.start)
      .lt("scheduled_at", range.end),
    supabase
      .from("appointment_participants")
      .select("*, appointments!inner(scheduled_at)", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("appointments.scheduled_at", range.start)
      .lt("appointments.scheduled_at", range.end),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .gte("scheduled_at", range.start)
      .lt("scheduled_at", range.end),
    supabase
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .gte("created_at", range.start)
      .lt("created_at", range.end),
    supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
    countTodayStatusReports(now),
    supabase.from("polls").select("*", { count: "exact", head: true }).eq("status", "open"),
  ]);

  return {
    activeEmployeeCount: activeEmployees.count ?? 0,
    monthlyCompletedVisitCount: (soloVisits.count ?? 0) + (hostedVisits.count ?? 0) + (participantVisits.count ?? 0),
    monthlyAppointmentCount: appointments.count ?? 0,
    monthlyReviewCount: reviews.count ?? 0,
    pendingReportCount: pendingReports.count ?? 0,
    todayStatusReportCount,
    openPollCount: openPolls.count ?? 0,
  };
}
