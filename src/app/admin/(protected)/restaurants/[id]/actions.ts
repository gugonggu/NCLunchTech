"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/auth/admin-log";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function setRestaurantActive(restaurantId: string, isActive: boolean) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("restaurants")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", restaurantId);

  if (error) {
    throw new Error("상태 변경에 실패했습니다.");
  }

  await logAdminAction(admin.id, isActive ? "activate_restaurant" : "deactivate_restaurant", {
    targetType: "restaurant",
    targetId: restaurantId,
  });

  revalidatePath(`/admin/restaurants/${restaurantId}`);
}

export async function setExcludedFromRecommend(restaurantId: string, excluded: boolean) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("restaurants")
    .update({ excluded_from_recommend: excluded, updated_at: new Date().toISOString() })
    .eq("id", restaurantId);

  if (error) {
    throw new Error("추천 제외 설정 변경에 실패했습니다.");
  }

  await logAdminAction(admin.id, excluded ? "exclude_from_recommend" : "include_in_recommend", {
    targetType: "restaurant",
    targetId: restaurantId,
  });

  revalidatePath(`/admin/restaurants/${restaurantId}`);
}

export async function restoreMenuItem(restaurantId: string, menuItemId: string) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const supabase = createServiceRoleClient();
  const { data: historyRow } = await supabase
    .from("change_history")
    .select("before")
    .eq("entity_type", "menu_item")
    .eq("entity_id", menuItemId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const before = historyRow?.before as { price: number | null; is_sold_out: boolean } | null;
  if (!before) {
    redirect(`/admin/restaurants/${restaurantId}?status=no_history`);
  }

  const { error } = await supabase
    .from("menu_items")
    .update({ price: before.price, is_sold_out: before.is_sold_out, updated_at: new Date().toISOString() })
    .eq("id", menuItemId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error("복구에 실패했습니다.");
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
  const { data: historyRow } = await supabase
    .from("change_history")
    .select("before")
    .eq("entity_type", "restaurant_hours")
    .eq("entity_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const before = historyRow?.before as
    | { day_of_week: number; is_closed: boolean; open_time: string | null; close_time: string | null }[]
    | null;

  if (!before || before.length === 0) {
    redirect(`/admin/restaurants/${restaurantId}?status=no_history`);
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("restaurant_hours").upsert(
    before.map((row) => ({
      restaurant_id: restaurantId,
      day_of_week: row.day_of_week,
      is_closed: row.is_closed,
      open_time: row.open_time,
      close_time: row.close_time,
      updated_at: now,
    })),
    { onConflict: "restaurant_id,day_of_week" }
  );

  if (error) {
    throw new Error("복구에 실패했습니다.");
  }

  await logAdminAction(admin.id, "restore_restaurant_hours", {
    targetType: "restaurant_hours",
    targetId: restaurantId,
    detail: { restoredTo: before },
  });

  redirect(`/admin/restaurants/${restaurantId}?status=restored`);
}
