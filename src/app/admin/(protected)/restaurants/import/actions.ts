"use server";

import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { logAdminAction } from "@/lib/auth/admin-log";
import { parseMenuCsv, type RestaurantLookup } from "@/lib/admin/csv-menu";
import { parseHoursCsv } from "@/lib/admin/csv-hours";
import { createCsvBatch, getCsvBatch, markCsvBatchApplied } from "@/lib/admin/csv-batches";

function redirectToUpload(status: string): never {
  redirect(`/admin/restaurants/import?status=${status}`);
}

async function getRestaurantLookup(): Promise<RestaurantLookup[]> {
  const supabase = createServiceRoleClient();
  const restaurants = await fetchAllRows((from, to) =>
    supabase.from("restaurants").select("id, name, kakao_place_id").range(from, to)
  );
  return restaurants.map((r) => ({ id: r.id, name: r.name, kakaoPlaceId: r.kakao_place_id }));
}

export async function uploadMenuCsv(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirectToUpload("no_file");
  }

  const text = await file.text();
  const restaurants = await getRestaurantLookup();

  const supabase = createServiceRoleClient();
  const existingMenuItems = await fetchAllRows((from, to) =>
    supabase.from("menu_items").select("restaurant_id, name").range(from, to)
  );

  const { rows, headerValid } = parseMenuCsv(
    text,
    restaurants,
    existingMenuItems.map((m) => ({ restaurantId: m.restaurant_id, name: m.name }))
  );

  if (!headerValid) {
    redirectToUpload("header_invalid_menu");
  }

  const batchId = await createCsvBatch(admin.id, "menu", rows);
  redirect(`/admin/restaurants/import/${batchId}`);
}

export async function uploadHoursCsv(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirectToUpload("no_file");
  }

  const text = await file.text();
  const restaurants = await getRestaurantLookup();

  const supabase = createServiceRoleClient();
  const existingHours = await fetchAllRows((from, to) =>
    supabase.from("restaurant_hours").select("restaurant_id, day_of_week").range(from, to)
  );

  const { rows, headerValid } = parseHoursCsv(
    text,
    restaurants,
    existingHours.map((h) => ({ restaurantId: h.restaurant_id, dayOfWeek: h.day_of_week }))
  );

  if (!headerValid) {
    redirectToUpload("header_invalid_hours");
  }

  const batchId = await createCsvBatch(admin.id, "hours", rows);
  redirect(`/admin/restaurants/import/${batchId}`);
}

export async function applyCsvBatch(batchId: string) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const batch = await getCsvBatch(batchId);
  if (!batch) {
    redirect("/admin/restaurants/import?status=batch_not_found");
  }
  if (batch.status === "applied") {
    redirect(`/admin/restaurants/import/${batchId}?status=already_applied`);
  }

  const supabase = createServiceRoleClient();

  if (batch.type === "menu") {
    const validRows = (batch.rows as import("@/lib/admin/csv-menu").MenuCsvRow[]).filter(
      (r) => r.errors.length === 0 && r.restaurantId
    );

    for (const row of validRows) {
      const { data: existing } = await supabase
        .from("menu_items")
        .select("id")
        .eq("restaurant_id", row.restaurantId as string)
        .eq("name", row.name)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("menu_items")
          .update({ price: row.price, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("menu_items").insert({
          restaurant_id: row.restaurantId,
          name: row.name,
          price: row.price,
        });
      }
    }

    await markCsvBatchApplied(batchId);
    await logAdminAction(admin.id, "apply_csv_batch", {
      targetType: "csv_import_batch",
      targetId: batchId,
      detail: { type: "menu", appliedCount: validRows.length },
    });
  } else {
    const validRows = (batch.rows as import("@/lib/admin/csv-hours").HoursCsvRow[]).filter(
      (r) => r.errors.length === 0 && r.restaurantId && r.dayOfWeek !== null
    );

    if (validRows.length > 0) {
      const { error } = await supabase.from("restaurant_hours").upsert(
        validRows.map((row) => ({
          restaurant_id: row.restaurantId,
          day_of_week: row.dayOfWeek,
          is_closed: row.isClosed,
          open_time: row.openTime,
          close_time: row.closeTime,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "restaurant_id,day_of_week" }
      );

      if (error) {
        throw new Error("영업시간 반영에 실패했습니다.");
      }
    }

    await markCsvBatchApplied(batchId);
    await logAdminAction(admin.id, "apply_csv_batch", {
      targetType: "csv_import_batch",
      targetId: batchId,
      detail: { type: "hours", appliedCount: validRows.length },
    });
  }

  redirect(`/admin/restaurants/import/${batchId}?status=applied`);
}
