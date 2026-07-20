import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { VisitStatus } from "./validation";

export interface ActiveVisit {
  id: string;
  restaurantId: string;
  status: VisitStatus;
  restaurantName: string;
  restaurantCategory: string;
  restaurantLat: number;
  restaurantLng: number;
}

/** 오늘의 활성(planned 또는 completed) 방문을 식당 정보와 함께 조회한다. 없으면 null. */
export async function getActiveVisitToday(
  employeeId: string,
  visitDate: string
): Promise<ActiveVisit | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("visits")
    .select("id, restaurant_id, status, restaurants(name, category, lat, lng)")
    .eq("employee_id", employeeId)
    .eq("visit_date", visitDate)
    .in("status", ["planned", "completed"])
    .maybeSingle();

  if (!data) {
    return null;
  }

  const restaurant = data.restaurants as unknown as {
    name: string;
    category: string;
    lat: number;
    lng: number;
  } | null;

  if (!restaurant) {
    return null;
  }

  return {
    id: data.id,
    restaurantId: data.restaurant_id,
    status: data.status as VisitStatus,
    restaurantName: restaurant.name,
    restaurantCategory: restaurant.category,
    restaurantLat: restaurant.lat,
    restaurantLng: restaurant.lng,
  };
}

export interface CompletedVisit {
  restaurantId: string;
  visitDate: string;
}

/** sinceDate(YYYY-MM-DD) 이후의 완료 방문을 최근순으로 조회한다(추천 엔진의 최근 방문 감점용). */
export async function getRecentCompletedVisits(
  employeeId: string,
  sinceDate: string
): Promise<CompletedVisit[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("visits")
    .select("restaurant_id, visit_date")
    .eq("employee_id", employeeId)
    .eq("status", "completed")
    .gte("visit_date", sinceDate)
    .order("visit_date", { ascending: false });

  return (data ?? []).map((row) => ({ restaurantId: row.restaurant_id, visitDate: row.visit_date }));
}
