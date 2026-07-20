import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { RevisitIntent } from "./validation";

export interface MyReview {
  id: string;
  tasteRating: number;
  speedRating: number;
  priceRating: number;
  soloFitRating: number;
  revisitIntent: RevisitIntent;
  portionRating: number | null;
  crowdednessRating: number | null;
  groupFitRating: number | null;
  cleanlinessRating: number | null;
  tags: string[] | null;
  oneLineReview: string | null;
}

export async function getMyReview(employeeId: string, restaurantId: string): Promise<MyReview | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("reviews")
    .select(
      "id, taste_rating, speed_rating, price_rating, solo_fit_rating, revisit_intent, portion_rating, crowdedness_rating, group_fit_rating, cleanliness_rating, tags, one_line_review"
    )
    .eq("employee_id", employeeId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    tasteRating: data.taste_rating,
    speedRating: data.speed_rating,
    priceRating: data.price_rating,
    soloFitRating: data.solo_fit_rating,
    revisitIntent: data.revisit_intent as RevisitIntent,
    portionRating: data.portion_rating,
    crowdednessRating: data.crowdedness_rating,
    groupFitRating: data.group_fit_rating,
    cleanlinessRating: data.cleanliness_rating,
    tags: data.tags,
    oneLineReview: data.one_line_review,
  };
}

export interface ReviewSummary {
  count: number;
  avgTaste: number;
  avgSpeed: number;
  avgPrice: number;
  avgSoloFit: number;
  recentOneLineReviews: string[];
}

export async function getRestaurantReviewSummary(restaurantId: string): Promise<ReviewSummary | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("reviews")
    .select("taste_rating, speed_rating, price_rating, solo_fit_rating, one_line_review, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) {
    return null;
  }

  const count = data.length;
  const avg = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

  return {
    count,
    avgTaste: avg(data.map((r) => r.taste_rating)),
    avgSpeed: avg(data.map((r) => r.speed_rating)),
    avgPrice: avg(data.map((r) => r.price_rating)),
    avgSoloFit: avg(data.map((r) => r.solo_fit_rating)),
    recentOneLineReviews: data
      .map((r) => r.one_line_review)
      .filter((text): text is string => !!text)
      .slice(0, 10),
  };
}

/** 여러 식당의 리뷰 개수를 한 번에 조회한다(추천/목록 카드용). */
export async function getReviewCounts(restaurantIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (restaurantIds.length === 0) {
    return counts;
  }

  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("reviews").select("restaurant_id").in("restaurant_id", restaurantIds);

  for (const row of data ?? []) {
    counts.set(row.restaurant_id, (counts.get(row.restaurant_id) ?? 0) + 1);
  }
  return counts;
}

export interface ReportableReview {
  id: string;
  employeeId: string;
  employeeNickname: string;
  oneLineReview: string;
}

/** 신고 링크를 붙이기 위해 작성자 정보가 포함된 한 줄 후기 목록(있는 것만). */
export async function getReportableReviews(restaurantId: string): Promise<ReportableReview[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, employee_id, one_line_review, employees(nickname)")
    .eq("restaurant_id", restaurantId)
    .not("one_line_review", "is", null)
    .order("created_at", { ascending: false })
    .limit(10);

  return (data ?? [])
    .filter((r): r is typeof r & { one_line_review: string } => !!r.one_line_review)
    .map((r) => {
      const employee = r.employees as unknown as { nickname: string } | null;
      return {
        id: r.id,
        employeeId: r.employee_id,
        employeeNickname: employee?.nickname ?? "(알 수 없음)",
        oneLineReview: r.one_line_review,
      };
    });
}

/** 리뷰를 남기려면 그 식당에 완료된 방문(개인 또는 약속 참여/방장 확인) 이력이 있어야 한다. */
export async function hasCompletedVisit(employeeId: string, restaurantId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();

  const [{ count: visitCount }, { count: hostCount }, { data: participantRows }] = await Promise.all([
    supabase
      .from("visits")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", employeeId)
      .eq("restaurant_id", restaurantId)
      .eq("status", "completed"),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("host_employee_id", employeeId)
      .eq("restaurant_id", restaurantId)
      .eq("host_attendance_status", "completed"),
    supabase
      .from("appointment_participants")
      .select("appointments(restaurant_id)")
      .eq("employee_id", employeeId)
      .eq("status", "completed"),
  ]);

  const attendedViaAppointment = (participantRows ?? []).some((p) => {
    const appt = p.appointments as unknown as { restaurant_id: string } | null;
    return appt?.restaurant_id === restaurantId;
  });

  return (visitCount ?? 0) > 0 || (hostCount ?? 0) > 0 || attendedViaAppointment;
}
