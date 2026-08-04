import "server-only";
import { getSeoulMonthRange, type LeaderboardEmployee, type MonthlyActivities } from "@/lib/leaderboard";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { buildMonthlyLeaderEntries, type MonthlyLeaderEntry } from "./ranking";
import { monthlyLeaderboardMonthSchema } from "./validation";

export interface MonthOption {
  monthKey: string;
  label: string;
}

export interface FinalizedLeaderboard {
  monthKey: string;
  entries: MonthlyLeaderEntry[];
  myEntry: MonthlyLeaderEntry | null;
}

export interface MonthlyLeaderBadge {
  monthKey: string;
}

interface PeriodRow {
  id: string;
  month_key: string;
}

interface FinalizedEntryRow {
  employee_id: string;
  nickname_snapshot: string;
  review_score: number;
  explorer_score: number;
  menu_score: number;
  total_score: number;
  rank: number;
  is_monthly_leader: boolean;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return `${year}년 ${Number(month)}월`;
}

function previousMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const previous = month === 1 ? [year - 1, 12] : [year, month - 1];
  return `${previous[0]}-${String(previous[1]).padStart(2, "0")}-01`;
}

function nextMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const next = month === 12 ? [year + 1, 1] : [year, month + 1];
  return `${next[0]}-${String(next[1]).padStart(2, "0")}-01`;
}

function getMonthKeyForInstant(value: string) {
  return getSeoulMonthRange(new Date(value)).startDate;
}

function isUniqueConflict(error: { code?: string; message?: string }) {
  return error.code === "23505" || /duplicate key|unique constraint/i.test(error.message ?? "");
}

export async function finalizeMissingMonthlyLeaderboards(now: Date): Promise<void> {
  const supabase = createServiceRoleClient();
  const [periods, employees, reviews, visits, hostedAppointments, participantRows, mealRecords] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from("monthly_leaderboard_periods")
        .select("id, month_key")
        .order("month_key", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase.from("employees").select("id, nickname, is_active").order("id", { ascending: true }).range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("reviews")
        .select("employee_id, created_at")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("visits")
        .select("employee_id, restaurant_id, visit_date")
        .eq("status", "completed")
        .order("visit_date", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("appointments")
        .select("host_employee_id, restaurant_id, scheduled_at")
        .eq("host_attendance_status", "completed")
        .order("scheduled_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("appointment_participants")
        .select("employee_id, appointments(restaurant_id, scheduled_at)")
        .eq("status", "completed")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("meal_records")
        .select("employee_id, created_at")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
  ]);

  const activities: MonthlyActivities = {
    reviews: reviews.map((review) => ({ employeeId: review.employee_id, occurredAt: review.created_at })),
    visits: [
      ...visits.map((visit) => ({
        employeeId: visit.employee_id,
        restaurantId: visit.restaurant_id,
        occurredAt: new Date(`${visit.visit_date}T12:00:00+09:00`).toISOString(),
      })),
      ...hostedAppointments.map((appointment) => ({
        employeeId: appointment.host_employee_id,
        restaurantId: appointment.restaurant_id,
        occurredAt: appointment.scheduled_at,
      })),
      ...participantRows.flatMap((row) => {
        const appointment = row.appointments as unknown as { restaurant_id: string; scheduled_at: string } | null;
        return appointment
          ? [{ employeeId: row.employee_id, restaurantId: appointment.restaurant_id, occurredAt: appointment.scheduled_at }]
          : [];
      }),
    ],
    mealRecords: mealRecords.map((record) => ({ employeeId: record.employee_id, occurredAt: record.created_at })),
  };
  const currentMonthKey = getSeoulMonthRange(now).startDate;
  const lastPastMonthKey = previousMonthKey(currentMonthKey);
  const activityMonthKeys = [
    ...activities.reviews.map((activity) => getMonthKeyForInstant(activity.occurredAt)),
    ...activities.visits.map((activity) => getMonthKeyForInstant(activity.occurredAt)),
    ...activities.mealRecords.map((activity) => getMonthKeyForInstant(activity.occurredAt)),
  ].filter((monthKey) => monthKey < currentMonthKey);
  const finalizedPastMonthKeys = periods
    .map((period) => period.month_key)
    .filter((monthKey) => monthKey < currentMonthKey);
  const firstMonthKey = [...activityMonthKeys, ...finalizedPastMonthKeys, lastPastMonthKey].sort()[0];
  const finalizedMonthKeys = new Set(periods.map((period) => period.month_key));
  const employeeRows: LeaderboardEmployee[] = employees.map((employee) => ({
    id: employee.id,
    nickname: employee.nickname,
    isActive: employee.is_active,
  }));

  for (let monthKey = firstMonthKey; monthKey <= lastPastMonthKey; monthKey = nextMonthKey(monthKey)) {
    if (finalizedMonthKeys.has(monthKey)) {
      continue;
    }

    const result = buildMonthlyLeaderEntries(employeeRows, activities, new Date(`${monthKey}T00:00:00+09:00`));
    const { data, error } = await supabase.rpc("finalize_monthly_leaderboard", {
      p_month_key: monthKey,
      p_entries: result.entries.map((entry) => ({
        employee_id: entry.employeeId,
        nickname_snapshot: entry.nickname,
        review_score: entry.reviewScore,
        explorer_score: entry.explorerScore,
        menu_score: entry.menuScore,
        total_score: entry.totalScore,
        rank: entry.rank,
        is_monthly_leader: entry.isMonthlyLeader,
      })),
    });
    if (error && !isUniqueConflict(error)) {
      throw new Error(error.message);
    }
    if (data === false || isUniqueConflict(error ?? {})) {
      finalizedMonthKeys.add(monthKey);
      continue;
    }
    finalizedMonthKeys.add(monthKey);
  }
}

export async function getMonthlyLeaderboardMonths(): Promise<MonthOption[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("monthly_leaderboard_periods")
    .select("month_key")
    .order("month_key", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((period) => ({
    monthKey: period.month_key.slice(0, 7),
    label: formatMonthLabel(period.month_key),
  }));
}

export async function getFinalizedMonthlyLeaderboard(
  monthKey: string,
  employeeId: string
): Promise<FinalizedLeaderboard | null> {
  const parsedMonthKey = monthlyLeaderboardMonthSchema.safeParse(monthKey);
  if (!parsedMonthKey.success) {
    return null;
  }

  const supabase = createServiceRoleClient();
  const { data: period, error: periodError } = await supabase
    .from("monthly_leaderboard_periods")
    .select("id, month_key")
    .eq("month_key", parsedMonthKey.data)
    .maybeSingle();
  if (periodError) {
    throw new Error(periodError.message);
  }
  if (!period) {
    return null;
  }

  const { data, error } = await supabase
    .from("monthly_leaderboard_entries")
    .select(
      "employee_id, nickname_snapshot, review_score, explorer_score, menu_score, total_score, rank, is_monthly_leader"
    )
    .eq("period_id", period.id)
    .order("rank", { ascending: true })
    .order("total_score", { ascending: false })
    .order("nickname_snapshot", { ascending: true })
    .order("employee_id", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  const entries = (data ?? []).map(toMonthlyLeaderEntry);
  return {
    monthKey: period.month_key,
    entries,
    myEntry: entries.find((entry) => entry.employeeId === employeeId) ?? null,
  };
}

export async function getLatestMonthlyLeaderBadges(employeeIds: string[]): Promise<Map<string, MonthlyLeaderBadge>> {
  if (employeeIds.length === 0) {
    return new Map();
  }

  const supabase = createServiceRoleClient();
  const { data: leaders, error: leadersError } = await supabase
    .from("monthly_leaderboard_entries")
    .select("employee_id, period_id")
    .in("employee_id", employeeIds)
    .eq("is_monthly_leader", true)
    .order("period_id");
  if (leadersError) {
    throw new Error(leadersError.message);
  }
  const periodIds = [...new Set((leaders ?? []).map((leader) => leader.period_id))];
  if (periodIds.length === 0) {
    return new Map();
  }

  const { data: periods, error: periodsError } = await supabase
    .from("monthly_leaderboard_periods")
    .select("id, month_key")
    .in("id", periodIds)
    .order("month_key", { ascending: false });
  if (periodsError) {
    throw new Error(periodsError.message);
  }
  const monthByPeriodId = new Map((periods ?? []).map((period) => [period.id, period.month_key]));
  const badges = new Map<string, MonthlyLeaderBadge>();
  for (const leader of leaders ?? []) {
    const monthKey = monthByPeriodId.get(leader.period_id);
    const current = badges.get(leader.employee_id);
    if (monthKey && (!current || monthKey > current.monthKey)) {
      badges.set(leader.employee_id, { monthKey });
    }
  }
  return badges;
}

export async function getMonthlyLeaderHistory(employeeId: string): Promise<MonthlyLeaderBadge[]> {
  const supabase = createServiceRoleClient();
  const { data: entries, error: entriesError } = await supabase
    .from("monthly_leaderboard_entries")
    .select("period_id")
    .eq("employee_id", employeeId)
    .eq("is_monthly_leader", true)
    .order("period_id", { ascending: false });
  if (entriesError) {
    throw new Error(entriesError.message);
  }

  const periodIds = [...new Set((entries ?? []).map((entry) => entry.period_id))];
  if (periodIds.length === 0) {
    return [];
  }

  const { data: periods, error: periodsError } = await supabase
    .from("monthly_leaderboard_periods")
    .select("id, month_key")
    .in("id", periodIds)
    .order("month_key", { ascending: false });
  if (periodsError) {
    throw new Error(periodsError.message);
  }

  return (periods ?? []).map((period) => ({ monthKey: period.month_key }));
}

function toMonthlyLeaderEntry(entry: FinalizedEntryRow): MonthlyLeaderEntry {
  return {
    employeeId: entry.employee_id,
    nickname: entry.nickname_snapshot,
    reviewScore: entry.review_score,
    explorerScore: entry.explorer_score,
    menuScore: entry.menu_score,
    totalScore: entry.total_score,
    rank: entry.rank,
    isMonthlyLeader: entry.is_monthly_leader,
  };
}
