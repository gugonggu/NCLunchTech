import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { buildMonthlyLeaderboard, getSeoulMonthRange } from "@/lib/leaderboard";

export async function getMonthlyLeaderboard(currentEmployeeId: string, now = new Date()) {
  const supabase = createServiceRoleClient();
  const range = getSeoulMonthRange(now);

  const [employees, reviews, visits, hostedAppointments, participantRows, mealRecords] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase.from("employees").select("id, nickname, is_active").eq("is_active", true).range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("reviews")
        .select("employee_id, created_at")
        .gte("created_at", range.start)
        .lt("created_at", range.end)
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("visits")
        .select("employee_id, restaurant_id, visit_date")
        .eq("status", "completed")
        .gte("visit_date", range.startDate)
        .lt("visit_date", range.endDate)
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("appointments")
        .select("host_employee_id, restaurant_id, scheduled_at")
        .eq("host_attendance_status", "completed")
        .gte("scheduled_at", range.start)
        .lt("scheduled_at", range.end)
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("appointment_participants")
        .select("employee_id, appointments(restaurant_id, scheduled_at)")
        .eq("status", "completed")
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("meal_records")
        .select("employee_id, created_at")
        .gte("created_at", range.start)
        .lt("created_at", range.end)
        .range(from, to)
    ),
  ]);

  const participantVisits = participantRows.flatMap((row) => {
    const appointment = row.appointments as unknown as { restaurant_id: string; scheduled_at: string } | null;
    return appointment
      ? [{ employeeId: row.employee_id, restaurantId: appointment.restaurant_id, occurredAt: appointment.scheduled_at }]
      : [];
  });

  return buildMonthlyLeaderboard(
    employees.map((employee) => ({
      id: employee.id,
      nickname: employee.nickname,
      isActive: employee.is_active,
    })),
    {
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
        ...participantVisits,
      ],
      mealRecords: mealRecords.map((record) => ({ employeeId: record.employee_id, occurredAt: record.created_at })),
    },
    currentEmployeeId,
    now
  );
}
