import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { REVIEW_PHOTOS_BUCKET } from "@/lib/review-photos/validation";
import { aggregateReviewRows, type ReviewAggregate } from "./validation";
import type { RevisitIntent } from "./validation";
import type { MealSource } from "@/lib/meals/validation";

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

export async function hasMyReview(employeeId: string, restaurantId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("reviews")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  return !!data;
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

export interface RecentReview {
  id: string;
  employeeId: string;
  employeeNickname: string;
  tasteRating: number;
  speedRating: number;
  priceRating: number;
  soloFitRating: number;
  oneLineReview: string | null;
  tags: string[] | null;
  mealRecord: { menuName: string; paidPrice: number } | null;
  photos: { id: string; url: string }[];
}

interface RecentReviewRow {
  id: string;
  employee_id: string;
  taste_rating: number;
  speed_rating: number;
  price_rating: number;
  solo_fit_rating: number;
  one_line_review: string | null;
  tags: string[] | null;
  employees: { nickname: string } | null;
}

interface RecentReviewPhotoRow {
  id: string;
  review_id: string;
  storage_path: string;
  created_at: string;
}

interface RecentReviewMealRow {
  employee_id: string;
  menu_name_snapshot: string;
  paid_price: number;
  created_at: string;
}

export function mapRecentReviewRows(
  reviews: RecentReviewRow[],
  photos: RecentReviewPhotoRow[],
  mealRecords: RecentReviewMealRow[],
  toPublicUrl: (storagePath: string) => string
): RecentReview[] {
  const photosByReviewId = new Map<string, { id: string; url: string }[]>();
  for (const photo of photos) {
    const list = photosByReviewId.get(photo.review_id) ?? [];
    list.push({ id: photo.id, url: toPublicUrl(photo.storage_path) });
    photosByReviewId.set(photo.review_id, list);
  }

  const mealsByEmployeeId = new Map<string, { menuName: string; paidPrice: number }>();
  for (const meal of mealRecords) {
    if (!mealsByEmployeeId.has(meal.employee_id)) {
      mealsByEmployeeId.set(meal.employee_id, {
        menuName: meal.menu_name_snapshot,
        paidPrice: meal.paid_price,
      });
    }
  }

  return reviews.map((r) => ({
    id: r.id,
    employeeId: r.employee_id,
    employeeNickname: r.employees?.nickname ?? "(알 수 없음)",
    tasteRating: r.taste_rating,
    speedRating: r.speed_rating,
    priceRating: r.price_rating,
    soloFitRating: r.solo_fit_rating,
    oneLineReview: r.one_line_review,
    tags: r.tags,
    mealRecord: mealsByEmployeeId.get(r.employee_id) ?? null,
    photos: photosByReviewId.get(r.id) ?? [],
  }));
}

/** 식당 상세에 개별 카드로 보여줄 최근 리뷰 목록(신고·댓글·도움돼요는 이 목록 단위로 붙는다). */
export async function getRecentReviews(restaurantId: string): Promise<RecentReview[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, employee_id, taste_rating, speed_rating, price_rating, solo_fit_rating, one_line_review, tags, employees(nickname)")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(10);

  const reviews = (data ?? []) as unknown as RecentReviewRow[];
  if (reviews.length === 0) {
    return [];
  }

  const reviewIds = reviews.map((review) => review.id);
  const employeeIds = [...new Set(reviews.map((review) => review.employee_id))];
  const [{ data: photos }, { data: mealRecords }] = await Promise.all([
    supabase
      .from("review_photos")
      .select("id, review_id, storage_path, created_at")
      .in("review_id", reviewIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("meal_records")
      .select("employee_id, menu_name_snapshot, paid_price, created_at")
      .eq("restaurant_id", restaurantId)
      .in("employee_id", employeeIds)
      .order("created_at", { ascending: false }),
  ]);

  const toPublicUrl = (storagePath: string) =>
    supabase.storage.from(REVIEW_PHOTOS_BUCKET).getPublicUrl(storagePath).data.publicUrl;

  return mapRecentReviewRows(
    reviews,
    (photos ?? []) as RecentReviewPhotoRow[],
    (mealRecords ?? []) as RecentReviewMealRow[],
    toPublicUrl
  );

  return (data ?? []).map((r) => {
    const employee = r.employees as unknown as { nickname: string } | null;
    return {
      id: r.id,
      employeeId: r.employee_id,
      tasteRating: r.taste_rating,
      speedRating: r.speed_rating,
      priceRating: r.price_rating,
      soloFitRating: r.solo_fit_rating,
      employeeNickname: employee?.nickname ?? "(알 수 없음)",
      oneLineReview: r.one_line_review,
      tags: r.tags,
      mealRecord: null,
      photos: [],
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

/** A review opened from a chosen lunch source must be tied to that employee and restaurant. */
export async function hasReviewAccessForSource(
  employeeId: string,
  restaurantId: string,
  source: MealSource
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (source.visitId) {
    const { data } = await supabase
      .from("visits")
      .select("id")
      .eq("id", source.visitId)
      .eq("employee_id", employeeId)
      .eq("restaurant_id", restaurantId)
      .in("status", ["planned", "completed"])
      .maybeSingle();
    return !!data;
  }

  const [hostResult, participantResult] = await Promise.all([
    supabase
      .from("appointments")
      .select("id")
      .eq("id", source.appointmentId!)
      .eq("host_employee_id", employeeId)
      .eq("restaurant_id", restaurantId)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("appointment_participants")
      .select("appointments!inner(id, restaurant_id, status)")
      .eq("appointment_id", source.appointmentId!)
      .eq("employee_id", employeeId)
      .in("status", ["accepted", "completed"]),
  ]);
  const participantAppointment = participantResult.data?.[0]?.appointments as unknown as {
    restaurant_id: string;
    status: string;
  } | null;
  return (
    !!hostResult.data ||
    (participantAppointment?.restaurant_id === restaurantId && participantAppointment.status === "active")
  );
}

/** 추천 엔진 2.0(2-7)용: 여러 식당의 리뷰를 한 번에 집계한다(평균 평점, 최다 언급 태그). */
export async function getReviewAggregates(restaurantIds: string[]): Promise<Map<string, ReviewAggregate>> {
  if (restaurantIds.length === 0) {
    return new Map();
  }

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("reviews")
    .select("restaurant_id, taste_rating, speed_rating, price_rating, solo_fit_rating, tags")
    .in("restaurant_id", restaurantIds);

  return aggregateReviewRows(
    (data ?? []).map((row) => ({
      restaurantId: row.restaurant_id,
      tasteRating: row.taste_rating,
      speedRating: row.speed_rating,
      priceRating: row.price_rating,
      soloFitRating: row.solo_fit_rating,
      tags: row.tags,
    }))
  );
}
