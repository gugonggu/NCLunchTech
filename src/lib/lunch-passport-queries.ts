import "server-only";
import { buildLunchPassport, type LunchPassport } from "@/lib/lunch-passport";
import { createServiceRoleClient } from "@/lib/supabase/server";

function seoulDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(value)).reduce<Record<string, string>>((parts, part) => ({ ...parts, [part.type]: part.value }), {});
}

export async function getLunchPassport(employeeId: string): Promise<LunchPassport> {
  const supabase = createServiceRoleClient();
  const [{ data: restaurants }, { data: visits }, { data: hosted }, { data: participants }] = await Promise.all([
    supabase.from("restaurants").select("id, name, category, is_active").eq("is_active", true),
    supabase.from("visits").select("restaurant_id, visit_date").eq("employee_id", employeeId).eq("status", "completed"),
    supabase.from("appointments").select("restaurant_id, scheduled_at").eq("host_employee_id", employeeId).eq("host_attendance_status", "completed"),
    supabase.from("appointment_participants").select("appointments(restaurant_id, scheduled_at)").eq("employee_id", employeeId).eq("status", "completed"),
  ]);
  const appointmentVisits = (participants ?? []).flatMap((row) => {
    const appointment = row.appointments as unknown as { restaurant_id: string; scheduled_at: string } | null;
    if (!appointment) return [];
    const parts = seoulDate(appointment.scheduled_at);
    return [{ restaurantId: appointment.restaurant_id, visitedOn: `${parts.year}-${parts.month}-${parts.day}` }];
  });
  return buildLunchPassport(
    (restaurants ?? []).map((restaurant) => ({ id: restaurant.id, name: restaurant.name, category: restaurant.category, isActive: restaurant.is_active })),
    [
      ...(visits ?? []).map((visit) => ({ restaurantId: visit.restaurant_id, visitedOn: visit.visit_date })),
      ...(hosted ?? []).map((appointment) => { const parts = seoulDate(appointment.scheduled_at); return { restaurantId: appointment.restaurant_id, visitedOn: `${parts.year}-${parts.month}-${parts.day}` }; }),
      ...appointmentVisits,
    ]
  );
}
