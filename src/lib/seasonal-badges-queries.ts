import "server-only";
import { buildSeasonalBadges, getSeoulSeasonRange } from "@/lib/seasonal-badges";
import { createServiceRoleClient } from "@/lib/supabase/server";
export async function getSeasonalBadges(employeeId: string, now = new Date()) {
 const supabase = createServiceRoleClient(); const range = getSeoulSeasonRange(now);
 const [{ data: visits }, { data: reviews }] = await Promise.all([supabase.from("visits").select("restaurant_id, visit_date").eq("employee_id", employeeId).eq("status", "completed").gte("visit_date", range.start.slice(0,10)).lt("visit_date", range.end.slice(0,10)), supabase.from("reviews").select("id").eq("employee_id", employeeId).gte("created_at", range.start).lt("created_at", range.end)]);
 return { label: range.label, badges: buildSeasonalBadges((visits ?? []).map((visit) => ({ restaurantId: visit.restaurant_id })), (reviews ?? []).length) };
}
