"use server";

import { redirect } from "next/navigation";
import { adminUuidSchema, hoursHistorySnapshotSchema, menuHistorySnapshotSchema } from "@/lib/admin/validation";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/auth/admin-log";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { REVIEW_PHOTOS_BUCKET } from "@/lib/review-photos/validation";
import { invalidateStatusReport } from "@/lib/status-reports/queries";

export async function setRestaurantActive(restaurantId: string, isActive: boolean) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  if (!adminUuidSchema.safeParse(restaurantId).success || typeof isActive !== "boolean") {
    redirect("/admin/restaurants?status=invalid_target");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("restaurants")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", restaurantId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("상태 변경에 실패했습니다.");
  }
  if (!data) {
    redirect(`/admin/restaurants/${restaurantId}?status=target_not_found`);
  }

  await logAdminAction(admin.id, isActive ? "activate_restaurant" : "deactivate_restaurant", {
    targetType: "restaurant",
    targetId: restaurantId,
  });

  redirect(`/admin/restaurants/${restaurantId}?status=updated`);
}

export async function setExcludedFromRecommend(restaurantId: string, excluded: boolean) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  if (!adminUuidSchema.safeParse(restaurantId).success || typeof excluded !== "boolean") {
    redirect("/admin/restaurants?status=invalid_target");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("restaurants")
    .update({ excluded_from_recommend: excluded, updated_at: new Date().toISOString() })
    .eq("id", restaurantId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("추천 제외 설정 변경에 실패했습니다.");
  }
  if (!data) {
    redirect(`/admin/restaurants/${restaurantId}?status=target_not_found`);
  }

  await logAdminAction(admin.id, excluded ? "exclude_from_recommend" : "include_in_recommend", {
    targetType: "restaurant",
    targetId: restaurantId,
  });

  redirect(`/admin/restaurants/${restaurantId}?status=updated`);
}

export async function restoreMenuItem(restaurantId: string, menuItemId: string) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  if (!adminUuidSchema.safeParse(restaurantId).success || !adminUuidSchema.safeParse(menuItemId).success) {
    redirect("/admin/restaurants?status=invalid_target");
  }

  const supabase = createServiceRoleClient();
  const { data: historyRow, error: historyError } = await supabase
    .from("change_history")
    .select("before")
    .eq("entity_type", "menu_item")
    .eq("entity_id", menuItemId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (historyError) {
    throw new Error("변경 이력 조회에 실패했습니다.");
  }

  if (!historyRow) {
    redirect(`/admin/restaurants/${restaurantId}?status=no_history`);
  }
  const beforeResult = menuHistorySnapshotSchema.safeParse(historyRow.before);
  if (!beforeResult.success) {
    redirect(`/admin/restaurants/${restaurantId}?status=invalid_history`);
  }
  const before = beforeResult.data;

  const { data, error } = await supabase
    .from("menu_items")
    .update({ price: before.price, is_sold_out: before.is_sold_out, updated_at: new Date().toISOString() })
    .eq("id", menuItemId)
    .eq("restaurant_id", restaurantId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("복구에 실패했습니다.");
  }
  if (!data) {
    redirect(`/admin/restaurants/${restaurantId}?status=target_not_found`);
  }

  await logAdminAction(admin.id, "restore_menu_item", {
    targetType: "menu_item",
    targetId: menuItemId,
    detail: { restoredTo: before },
  });

  redirect(`/admin/restaurants/${restaurantId}?status=restored`);
}

export async function restoreRestaurantHours(restaurantId: string) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const supabase = createServiceRoleClient();
  if (!adminUuidSchema.safeParse(restaurantId).success) {
    redirect("/admin/restaurants?status=invalid_target");
  }

  const { data: historyRow, error: historyError } = await supabase
    .from("change_history")
    .select("before")
    .eq("entity_type", "restaurant_hours")
    .eq("entity_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (historyError) {
    throw new Error("변경 이력 조회에 실패했습니다.");
  }

  if (!historyRow) {
    redirect(`/admin/restaurants/${restaurantId}?status=no_history`);
  }
  const beforeResult = hoursHistorySnapshotSchema.safeParse(historyRow.before);
  if (!beforeResult.success) {
    redirect(`/admin/restaurants/${restaurantId}?status=invalid_history`);
  }
  const before = beforeResult.data;
  if (before.length === 0) {
    redirect(`/admin/restaurants/${restaurantId}?status=no_history`);
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase.from("restaurant_hours").upsert(
    before.map((row) => ({
      restaurant_id: restaurantId,
      day_of_week: row.day_of_week,
      is_closed: row.is_closed,
      open_time: row.open_time,
      close_time: row.close_time,
      updated_at: now,
    })),
    { onConflict: "restaurant_id,day_of_week" }
  ).select("id");

  if (error) {
    throw new Error("복구에 실패했습니다.");
  }
  if (!data || data.length !== before.length) {
    throw new Error("영업시간 복구 결과를 확인할 수 없습니다.");
  }

  await logAdminAction(admin.id, "restore_restaurant_hours", {
    targetType: "restaurant_hours",
    targetId: restaurantId,
    detail: { restoredTo: before },
  });

  redirect(`/admin/restaurants/${restaurantId}?status=restored`);
}

export async function deleteReviewPhotoAsAdmin(restaurantId: string, photoId: string) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  if (!adminUuidSchema.safeParse(restaurantId).success || !adminUuidSchema.safeParse(photoId).success) {
    redirect("/admin/restaurants?status=invalid_target");
  }

  const supabase = createServiceRoleClient();
  const { data: photo } = await supabase
    .from("review_photos")
    .select("id, storage_path")
    .eq("id", photoId)
    .maybeSingle();

  if (!photo) {
    redirect(`/admin/restaurants/${restaurantId}?status=target_not_found`);
  }

  await supabase.storage.from(REVIEW_PHOTOS_BUCKET).remove([photo.storage_path]);
  const { error } = await supabase.from("review_photos").delete().eq("id", photoId);

  if (error) {
    throw new Error("사진 삭제에 실패했습니다.");
  }

  await logAdminAction(admin.id, "delete_review_photo", {
    targetType: "review_photo",
    targetId: photoId,
  });

  redirect(`/admin/restaurants/${restaurantId}?status=updated`);
}

export async function deleteReviewCommentAsAdmin(restaurantId: string, commentId: string) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  if (!adminUuidSchema.safeParse(restaurantId).success || !adminUuidSchema.safeParse(commentId).success) {
    redirect("/admin/restaurants?status=invalid_target");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("review_comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("댓글 삭제에 실패했습니다.");
  }
  if (!data) {
    redirect(`/admin/restaurants/${restaurantId}?status=target_not_found`);
  }

  await logAdminAction(admin.id, "delete_review_comment", {
    targetType: "review_comment",
    targetId: commentId,
  });

  redirect(`/admin/restaurants/${restaurantId}?status=updated`);
}

export async function invalidateStatusReportAction(restaurantId: string, reportId: string) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  if (!adminUuidSchema.safeParse(restaurantId).success || !adminUuidSchema.safeParse(reportId).success) {
    redirect("/admin/restaurants?status=invalid_target");
  }

  const wasInvalidated = await invalidateStatusReport(reportId, admin.id);
  if (!wasInvalidated) {
    redirect(`/admin/restaurants/${restaurantId}?status=target_not_found`);
  }

  await logAdminAction(admin.id, "invalidate_status_report", {
    targetType: "restaurant_status_report",
    targetId: reportId,
  });

  redirect(`/admin/restaurants/${restaurantId}?status=updated`);
}
