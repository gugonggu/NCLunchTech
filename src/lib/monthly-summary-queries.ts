import "server-only";
import { getSeoulMonthRange } from "@/lib/leaderboard";
import { buildMonthlySummary } from "@/lib/monthly-summary";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function getMonthlySummary(employeeId: string, now = new Date()) {
  const supabase = createServiceRoleClient(); const range = getSeoulMonthRange(now);
  const [{ data: visits }, { data: hosted }, { data: participants }, { data: reviews }, { data: meals }, { data: restaurants }] = await Promise.all([
    supabase.from("visits").select("restaurant_id, visit_date").eq("employee_id", employeeId).eq("status", "completed").gte("visit_date", range.startDate).lt("visit_date", range.endDate),
    supabase.from("appointments").select("restaurant_id, scheduled_at").eq("host_employee_id", employeeId).eq("host_attendance_status", "completed").gte("scheduled_at", range.start).lt("scheduled_at", range.end),
    supabase.from("appointment_participants").select("appointments(restaurant_id, scheduled_at)").eq("employee_id", employeeId).eq("status", "completed"),
    supabase.from("reviews").select("created_at").eq("employee_id", employeeId).gte("created_at", range.start).lt("created_at", range.end),
    supabase.from("meal_records").select("created_at").eq("employee_id", employeeId).gte("created_at", range.start).lt("created_at", range.end),
    supabase.from("restaurants").select("id, name").eq("is_active", true),
  ]);
  const participant = (participants ?? []).flatMap((row) => { const a = row.appointments as unknown as { restaurant_id: string; scheduled_at: string } | null; return a ? [{ restaurantId: a.restaurant_id, occurredAt: a.scheduled_at }] : []; });
  return buildMonthlySummary({ visits: [...(visits ?? []).map((v) => ({ restaurantId: v.restaurant_id, occurredAt: new Date(`${v.visit_date}T12:00:00+09:00`).toISOString() })), ...(hosted ?? []).map((a) => ({ restaurantId: a.restaurant_id, occurredAt: a.scheduled_at })), ...participant], reviews: (reviews ?? []).map((r) => r.created_at), meals: (meals ?? []).map((m) => m.created_at) }, new Map((restaurants ?? []).map((r) => [r.id, r.name])), now);
}
