"use server";

import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { parseMenuCsv, type RestaurantLookup } from "@/lib/admin/csv-menu";
import { parseHoursCsv } from "@/lib/admin/csv-hours";
import { createCsvBatch, getCsvBatch, InvalidCsvBatchError } from "@/lib/admin/csv-batches";
import { adminUuidSchema, validateCsvUpload } from "@/lib/admin/validation";
import { parseCsvApplyRpcResult } from "@/lib/admin/rpc-result";

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

  const upload = await validateCsvUpload(formData.get("file"));
  if (!upload.ok) {
    redirectToUpload(upload.status);
  }

  const text = upload.text;
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

  const upload = await validateCsvUpload(formData.get("file"));
  if (!upload.ok) {
    redirectToUpload(upload.status);
  }

  const text = upload.text;
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

  if (!adminUuidSchema.safeParse(batchId).success) {
    redirect("/admin/restaurants/import?status=batch_not_found");
  }

  let batch: Awaited<ReturnType<typeof getCsvBatch>>;
  try {
    batch = await getCsvBatch(batchId);
  } catch (error) {
    if (error instanceof InvalidCsvBatchError) {
      redirect(`/admin/restaurants/import/${batchId}?status=batch_invalid`);
    }
    throw error;
  }
  if (!batch) {
    redirect("/admin/restaurants/import?status=batch_not_found");
  }
  if (batch.status === "applied") {
    redirect(`/admin/restaurants/import/${batchId}?status=already_applied`);
  }
  if (batch.rows.some((row) => row.errors.length > 0)) {
    redirect(`/admin/restaurants/import/${batchId}?status=validation_errors`);
  }

  const supabase = createServiceRoleClient();
  const validMenuRows = batch.type === "menu"
    ? (batch.rows as import("@/lib/admin/csv-menu").MenuCsvRow[]).filter(
        (row) => row.errors.length === 0 && row.restaurantId
      )
    : [];
  const validHoursRows = batch.type === "hours"
    ? (batch.rows as import("@/lib/admin/csv-hours").HoursCsvRow[]).filter(
        (row) => row.errors.length === 0 && row.restaurantId && row.dayOfWeek !== null
      )
    : [];
  if ((batch.type === "menu" ? validMenuRows : validHoursRows).length === 0) {
    redirect(`/admin/restaurants/import/${batchId}?status=no_valid_rows`);
  }

  const { data, error } = await supabase.rpc("admin_apply_csv_batch", {
    p_admin_id: admin.id,
    p_batch_id: batchId,
  });
  if (error) {
    redirect(`/admin/restaurants/import/${batchId}?status=apply_failed`);
  }

  let result: ReturnType<typeof parseCsvApplyRpcResult>;
  try {
    result = parseCsvApplyRpcResult(data);
  } catch {
    redirect(`/admin/restaurants/import/${batchId}?status=apply_failed`);
  }

  if (result.status === "batch_not_found") {
    redirect("/admin/restaurants/import?status=batch_not_found");
  }
  if (result.status === "already_applied") {
    redirect(`/admin/restaurants/import/${batchId}?status=already_applied`);
  }
  if (result.status === "no_valid_rows") {
    redirect(`/admin/restaurants/import/${batchId}?status=no_valid_rows`);
  }
  redirect(`/admin/restaurants/import/${batchId}?status=applied`);
}
