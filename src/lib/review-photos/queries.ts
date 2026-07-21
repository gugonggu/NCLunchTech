import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { REVIEW_PHOTOS_BUCKET } from "./validation";

export interface ReviewPhoto {
  id: string;
  employeeId: string;
  storagePath: string;
  url: string;
  createdAt: string;
}

function toPublicUrl(storagePath: string): string {
  const supabase = createServiceRoleClient();
  return supabase.storage.from(REVIEW_PHOTOS_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

export async function getReviewPhotos(reviewId: string): Promise<ReviewPhoto[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("review_photos")
    .select("id, employee_id, storage_path, created_at")
    .eq("review_id", reviewId)
    .order("created_at");

  return (data ?? []).map((row) => ({
    id: row.id,
    employeeId: row.employee_id,
    storagePath: row.storage_path,
    url: toPublicUrl(row.storage_path),
    createdAt: row.created_at,
  }));
}

export async function countReviewPhotos(reviewId: string): Promise<number> {
  const supabase = createServiceRoleClient();
  const { count } = await supabase
    .from("review_photos")
    .select("*", { count: "exact", head: true })
    .eq("review_id", reviewId);

  return count ?? 0;
}

export interface RestaurantGalleryPhoto {
  id: string;
  url: string;
}

/** 식당 상세 갤러리용: 그 식당 리뷰들에 달린 최근 사진(최대 20장). */
export async function getRestaurantPhotoGallery(restaurantId: string): Promise<RestaurantGalleryPhoto[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("review_photos")
    .select("id, storage_path, reviews!inner(restaurant_id)")
    .eq("reviews.restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []).map((row) => ({
    id: row.id,
    url: toPublicUrl(row.storage_path),
  }));
}

export interface AdminGalleryPhoto {
  id: string;
  url: string;
  employeeNickname: string;
  createdAt: string;
}

/** 관리자 식당 상세용 최근 사진 목록(임의 삭제 대상 확인용). */
export async function getRestaurantPhotosForAdmin(restaurantId: string, limit = 20): Promise<AdminGalleryPhoto[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("review_photos")
    .select("id, storage_path, created_at, employees(nickname), reviews!inner(restaurant_id)")
    .eq("reviews.restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const employee = row.employees as unknown as { nickname: string } | null;
    return {
      id: row.id,
      url: toPublicUrl(row.storage_path),
      employeeNickname: employee?.nickname ?? "(알 수 없음)",
      createdAt: row.created_at,
    };
  });
}

export interface PhotoOwnership {
  id: string;
  employeeId: string;
  reviewId: string;
  storagePath: string;
}

export async function getPhotoForOwnershipCheck(photoId: string): Promise<PhotoOwnership | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("review_photos")
    .select("id, employee_id, review_id, storage_path")
    .eq("id", photoId)
    .maybeSingle();

  return data
    ? { id: data.id, employeeId: data.employee_id, reviewId: data.review_id, storagePath: data.storage_path }
    : null;
}

/** 관리자 화면·리뷰 삭제 전 정리용: 특정 리뷰(들)에 달린 사진의 storage_path 목록. */
export async function getStoragePathsForReviews(reviewIds: string[]): Promise<string[]> {
  if (reviewIds.length === 0) {
    return [];
  }
  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("review_photos").select("storage_path").in("review_id", reviewIds);
  return (data ?? []).map((row) => row.storage_path);
}

export async function getRepresentativeRestaurantPhotoMap(
  restaurantIds: string[],
): Promise<Map<string, string>> {
  if (restaurantIds.length === 0) {
    return new Map();
  }

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("review_photos")
    .select("storage_path, reviews!inner(restaurant_id)")
    .in("reviews.restaurant_id", restaurantIds)
    .order("created_at", { ascending: false });

  const result = new Map<string, string>();
  for (const row of data ?? []) {
    const review = row.reviews as unknown as {
      restaurant_id: string;
    } | null;
    if (review && !result.has(review.restaurant_id)) {
      result.set(review.restaurant_id, toPublicUrl(row.storage_path));
    }
  }

  return result;
}
