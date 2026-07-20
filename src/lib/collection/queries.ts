import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** 직원이 완료 방문(개인 방문 또는 약속 참여/방장 확인)한 식당 id 집합. */
export async function getVisitedRestaurantIds(employeeId: string): Promise<Set<string>> {
  const supabase = createServiceRoleClient();

  const [{ data: visits }, { data: hostedAppointments }, { data: participantRows }] = await Promise.all([
    supabase.from("visits").select("restaurant_id").eq("employee_id", employeeId).eq("status", "completed"),
    supabase
      .from("appointments")
      .select("restaurant_id")
      .eq("host_employee_id", employeeId)
      .eq("host_attendance_status", "completed"),
    supabase
      .from("appointment_participants")
      .select("appointments(restaurant_id)")
      .eq("employee_id", employeeId)
      .eq("status", "completed"),
  ]);

  const ids = new Set<string>();
  for (const v of visits ?? []) {
    ids.add(v.restaurant_id);
  }
  for (const a of hostedAppointments ?? []) {
    ids.add(a.restaurant_id);
  }
  for (const p of participantRows ?? []) {
    const appt = p.appointments as unknown as { restaurant_id: string } | null;
    if (appt) {
      ids.add(appt.restaurant_id);
    }
  }
  return ids;
}

export async function getFavoriteRestaurantIds(employeeId: string): Promise<Set<string>> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("favorites").select("restaurant_id").eq("employee_id", employeeId);
  return new Set((data ?? []).map((r) => r.restaurant_id));
}

export async function isFavorite(employeeId: string, restaurantId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("favorites")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  return !!data;
}

export interface CategoryBreakdown {
  category: string;
  visitedCount: number;
  totalCount: number;
}

/** 분류별 전체/방문 개수 집계(순수 계산, DB 접근 없음). categories 순서를 그대로 유지한다. */
export function buildCategoryBreakdown(
  categories: readonly string[],
  restaurants: { id: string; category: string }[],
  visitedIds: Set<string>
): CategoryBreakdown[] {
  const counts = new Map<string, { total: number; visited: number }>();
  for (const category of categories) {
    counts.set(category, { total: 0, visited: 0 });
  }

  for (const r of restaurants) {
    const entry = counts.get(r.category);
    if (!entry) {
      continue;
    }
    entry.total += 1;
    if (visitedIds.has(r.id)) {
      entry.visited += 1;
    }
  }

  return categories.map((category) => {
    const entry = counts.get(category)!;
    return { category, totalCount: entry.total, visitedCount: entry.visited };
  });
}
