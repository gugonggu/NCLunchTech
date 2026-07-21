import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  BUSINESS_STATUS_VALID_MINUTES,
  CONGESTION_VALID_MINUTES,
  EXCLUDING_BUSINESS_STATUS_VALUES,
  isReportFresh,
  shouldEditExistingReport,
  type ReportType,
} from "./validation";

export interface StatusSummary {
  latestValue: string;
  latestAt: string;
  freshCount: number;
  distinctReporterCount: number;
}

interface ReportRow {
  value: string;
  employee_id: string;
  created_at: string;
}

async function fetchRecentReports(restaurantId: string, reportType: ReportType, now: Date): Promise<ReportRow[]> {
  const supabase = createServiceRoleClient();
  const validMinutes = reportType === "congestion" ? CONGESTION_VALID_MINUTES : BUSINESS_STATUS_VALID_MINUTES;
  const since = new Date(now.getTime() - validMinutes * 60 * 1000);

  const { data } = await supabase
    .from("restaurant_status_reports")
    .select("value, employee_id, created_at")
    .eq("restaurant_id", restaurantId)
    .eq("report_type", reportType)
    .is("invalidated_at", null)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  return data ?? [];
}

function summarize(rows: ReportRow[], reportType: ReportType, now: Date): StatusSummary | null {
  const fresh = rows.filter((r) => isReportFresh(reportType, new Date(r.created_at), now));
  if (fresh.length === 0) {
    return null;
  }
  return {
    latestValue: fresh[0].value,
    latestAt: fresh[0].created_at,
    freshCount: fresh.length,
    distinctReporterCount: new Set(fresh.map((r) => r.employee_id)).size,
  };
}

/** 식당 상세에 표시할 혼잡도·영업 상태 요약(신선한 제보가 없으면 null → "정보 없음"). */
export async function getStatusSummary(
  restaurantId: string,
  now: Date
): Promise<{ congestion: StatusSummary | null; businessStatus: StatusSummary | null }> {
  const [congestionRows, businessRows] = await Promise.all([
    fetchRecentReports(restaurantId, "congestion", now),
    fetchRecentReports(restaurantId, "business_status", now),
  ]);

  return {
    congestion: summarize(congestionRows, "congestion", now),
    businessStatus: summarize(businessRows, "business_status", now),
  };
}

export interface MyRecentReport {
  id: string;
  createdAt: string;
}

/** 직원 본인의 가장 최근 제보(신선 여부와 무관, 수정 허용 창 판단용). */
export async function getMyRecentReport(
  employeeId: string,
  restaurantId: string,
  reportType: ReportType
): Promise<MyRecentReport | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("restaurant_status_reports")
    .select("id, created_at")
    .eq("employee_id", employeeId)
    .eq("restaurant_id", restaurantId)
    .eq("report_type", reportType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? { id: data.id, createdAt: data.created_at } : null;
}

/** 최근 제보가 수정 허용 창 이내면 그 행을 수정하고, 아니면 새 행을 만든다(이력 보존 + 반복 제보 방지). */
export async function submitReport(params: {
  employeeId: string;
  restaurantId: string;
  reportType: ReportType;
  value: string;
  now: Date;
}): Promise<void> {
  const supabase = createServiceRoleClient();
  const existing = await getMyRecentReport(params.employeeId, params.restaurantId, params.reportType);

  if (existing && shouldEditExistingReport(new Date(existing.createdAt), params.now)) {
    await supabase
      .from("restaurant_status_reports")
      .update({ value: params.value, updated_at: params.now.toISOString() })
      .eq("id", existing.id);
    return;
  }

  await supabase.from("restaurant_status_reports").insert({
    restaurant_id: params.restaurantId,
    employee_id: params.employeeId,
    report_type: params.reportType,
    value: params.value,
  });
}

interface LatestReportRow {
  restaurant_id: string;
  value: string;
  created_at: string;
}

/** 여러 식당 중 각각의 "가장 최근" 제보만 남긴다(오래된 값이 최신 값을 덮어쓰지 않도록). */
function latestPerRestaurant(rows: LatestReportRow[]): Map<string, { value: string; createdAt: string }> {
  const latest = new Map<string, { value: string; createdAt: string }>();
  for (const row of rows) {
    if (!latest.has(row.restaurant_id)) {
      latest.set(row.restaurant_id, { value: row.value, createdAt: row.created_at });
    }
  }
  return latest;
}

/** 추천 배치 조회: 신선한 최신 영업 상태가 "완전 제외 대상"(조기 마감·재료 소진·임시 휴무)인 식당 id → 그 값. */
export async function getExcludingBusinessStatusMap(
  restaurantIds: string[],
  now: Date
): Promise<Map<string, string>> {
  if (restaurantIds.length === 0) {
    return new Map();
  }

  const supabase = createServiceRoleClient();
  const since = new Date(now.getTime() - BUSINESS_STATUS_VALID_MINUTES * 60 * 1000);
  const { data } = await supabase
    .from("restaurant_status_reports")
    .select("restaurant_id, value, created_at")
    .in("restaurant_id", restaurantIds)
    .eq("report_type", "business_status")
    .is("invalidated_at", null)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  const result = new Map<string, string>();
  for (const [restaurantId, latest] of latestPerRestaurant(data ?? [])) {
    if (
      (EXCLUDING_BUSINESS_STATUS_VALUES as readonly string[]).includes(latest.value) &&
      isReportFresh("business_status", new Date(latest.createdAt), now)
    ) {
      result.set(restaurantId, latest.value);
    }
  }
  return result;
}

/** 추천용 배치 조회: 신선한 최신 혼잡도 값(한산/보통/혼잡) 자체를 식당별로 반환한다. */
export async function getFreshCongestionValueMap(restaurantIds: string[], now: Date): Promise<Map<string, string>> {
  if (restaurantIds.length === 0) {
    return new Map();
  }

  const supabase = createServiceRoleClient();
  const since = new Date(now.getTime() - CONGESTION_VALID_MINUTES * 60 * 1000);
  const { data } = await supabase
    .from("restaurant_status_reports")
    .select("restaurant_id, value, created_at")
    .in("restaurant_id", restaurantIds)
    .eq("report_type", "congestion")
    .is("invalidated_at", null)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  const result = new Map<string, string>();
  for (const [restaurantId, latest] of latestPerRestaurant(data ?? [])) {
    if (isReportFresh("congestion", new Date(latest.createdAt), now)) {
      result.set(restaurantId, latest.value);
    }
  }
  return result;
}

export interface AdminStatusReportRow {
  id: string;
  reportType: ReportType;
  value: string;
  employeeNickname: string;
  createdAt: string;
  invalidatedAt: string | null;
}

/** 관리자 식당 상세용 최근 제보 목록(무효화된 것도 함께 보여줌, 제보자 닉네임 노출). */
export async function getRecentStatusReportsForAdmin(
  restaurantId: string,
  limit = 20
): Promise<AdminStatusReportRow[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("restaurant_status_reports")
    .select("id, report_type, value, created_at, invalidated_at, employees(nickname)")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const employee = row.employees as unknown as { nickname: string } | null;
    return {
      id: row.id,
      reportType: row.report_type as ReportType,
      value: row.value,
      employeeNickname: employee?.nickname ?? "(알 수 없음)",
      createdAt: row.created_at,
      invalidatedAt: row.invalidated_at,
    };
  });
}

/** 관리자가 부적절하거나 잘못된 제보를 무효화한다(삭제하지 않고 감사용으로 보존). */
export async function invalidateStatusReport(reportId: string, adminId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("restaurant_status_reports")
    .update({ invalidated_at: new Date().toISOString(), invalidated_by: adminId })
    .eq("id", reportId)
    .is("invalidated_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("제보 무효화에 실패했습니다.");
  }
  return !!data;
}

/** Asia/Seoul 기준 오늘 자정(00:00)을 UTC Date로 계산한다. */
function startOfTodaySeoul(now: Date): Date {
  const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;
  const seoul = new Date(now.getTime() + SEOUL_OFFSET_MS);
  const startOfDaySeoulUtcMs = Date.UTC(seoul.getUTCFullYear(), seoul.getUTCMonth(), seoul.getUTCDate());
  return new Date(startOfDaySeoulUtcMs - SEOUL_OFFSET_MS);
}

/** 운영 통계용: 오늘(Asia/Seoul 자정 이후) 등록된 유효(무효화되지 않은) 제보 수. */
export async function countTodayStatusReports(now: Date): Promise<number> {
  const supabase = createServiceRoleClient();

  const { count } = await supabase
    .from("restaurant_status_reports")
    .select("*", { count: "exact", head: true })
    .is("invalidated_at", null)
    .gte("created_at", startOfTodaySeoul(now).toISOString());

  return count ?? 0;
}
