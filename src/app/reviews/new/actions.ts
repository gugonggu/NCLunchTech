"use server";

import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hasCompletedVisit } from "@/lib/reviews/queries";
import { normalizeReviewFormData, reviewSchema } from "@/lib/reviews/validation";
import { getCompletedMealSource, getMealRecordForSource } from "@/lib/meals/queries";
import {
  mealRecordSchema,
  mealMenuNameSchema,
  mealSourceSchema,
  normalizeMealRecordFormData,
  type MealStatusCode,
} from "@/lib/meals/validation";
import { countReviewPhotos, getPhotoForOwnershipCheck } from "@/lib/review-photos/queries";
import { processPhotoBuffer } from "@/lib/review-photos/image-processing";
import {
  MAX_PHOTOS_PER_REVIEW,
  MAX_PHOTO_BYTES,
  REVIEW_PHOTOS_BUCKET,
  buildPhotoStoragePath,
  isAllowedPhotoMimeType,
  type ReviewPhotoStatusCode,
} from "@/lib/review-photos/validation";

function redirectToForm(restaurantId: string, status: string): never {
  redirect(`/reviews/new?restaurantId=${restaurantId}&status=${status}`);
}

function redirectToPhotoForm(restaurantId: string, status: ReviewPhotoStatusCode): never {
  redirect(`/reviews/new?restaurantId=${restaurantId}&photoStatus=${status}`);
}

function redirectToMealForm(
  restaurantId: string,
  visitId: string | undefined,
  appointmentId: string | undefined,
  status: MealStatusCode
): never {
  const params = new URLSearchParams({ restaurantId, mealStatus: status });
  if (visitId) params.set("visitId", visitId);
  if (appointmentId) params.set("appointmentId", appointmentId);
  redirect(`/reviews/new?${params.toString()}`);
}

export async function upsertMealRecord(
  restaurantId: string,
  visitId: string | undefined,
  appointmentId: string | undefined,
  formData: FormData
) {
  const returnTo = `/reviews/new?${new URLSearchParams({
    restaurantId,
    ...(visitId ? { visitId } : {}),
    ...(appointmentId ? { appointmentId } : {}),
  }).toString()}`;
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const parsedSource = mealSourceSchema.safeParse({ visitId, appointmentId });
  if (!parsedSource.success) {
    redirectToMealForm(restaurantId, visitId, appointmentId, "invalid_source");
  }

  const completedSource = await getCompletedMealSource(employee.id, restaurantId, parsedSource.data);
  if (!completedSource) {
    redirectToMealForm(restaurantId, visitId, appointmentId, "invalid_source");
  }

  const parsed = mealRecordSchema.safeParse(normalizeMealRecordFormData(formData));
  if (!parsed.success) {
    redirectToMealForm(restaurantId, visitId, appointmentId, "invalid_input");
  }

  const supabase = createServiceRoleClient();
  let menuName = parsed.data.customMenuName;
  if (parsed.data.menuItemId) {
    const { data: menuItem } = await supabase
      .from("menu_items")
      .select("id, name")
      .eq("id", parsed.data.menuItemId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    if (!menuItem) {
      redirectToMealForm(restaurantId, visitId, appointmentId, "invalid_menu");
    }
    const parsedMenuName = mealMenuNameSchema.safeParse(menuItem.name);
    if (!parsedMenuName.success) {
      redirectToMealForm(restaurantId, visitId, appointmentId, "invalid_menu");
    }
    menuName = parsedMenuName.data;
  }

  const existing = await getMealRecordForSource(employee.id, completedSource);
  const values = {
    employee_id: employee.id,
    restaurant_id: restaurantId,
    visit_id: completedSource.visitId ?? null,
    appointment_id: completedSource.appointmentId ?? null,
    menu_item_id: parsed.data.menuItemId ?? null,
    menu_name_snapshot: menuName!,
    paid_price: parsed.data.paidPrice,
    updated_at: new Date().toISOString(),
  };

  let result;
  if (existing) {
    result = await supabase
        .from("meal_records")
        .update(values)
        .eq("id", existing.id)
        .eq("employee_id", employee.id)
        .select("id")
        .maybeSingle();
  } else {
    result = await supabase.from("meal_records").insert(values).select("id").maybeSingle();
    if (result.error?.code === "23505") {
      const concurrentlyCreated = await getMealRecordForSource(employee.id, completedSource);
      if (!concurrentlyCreated) {
        throw new Error("먹은 메뉴 기록 저장에 실패했습니다.");
      }
      result = await supabase
        .from("meal_records")
        .update(values)
        .eq("id", concurrentlyCreated.id)
        .eq("employee_id", employee.id)
        .select("id")
        .maybeSingle();
    }
  }

  if (result.error || !result.data) {
    throw new Error("먹은 메뉴 기록 저장에 실패했습니다.");
  }

  redirectToMealForm(restaurantId, visitId, appointmentId, "saved");
}

export async function upsertReview(restaurantId: string, formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/reviews/new?restaurantId=${restaurantId}`)}`);
  }

  const supabase = createServiceRoleClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .maybeSingle();

  if (!restaurant) {
    redirectToForm(restaurantId, "not_found");
  }

  const visited = await hasCompletedVisit(employee.id, restaurantId);
  if (!visited) {
    redirectToForm(restaurantId, "not_visited");
  }

  const parsed = reviewSchema.safeParse(normalizeReviewFormData(formData));
  if (!parsed.success) {
    redirectToForm(restaurantId, "invalid_input");
  }

  const { error } = await supabase.from("reviews").upsert(
    {
      employee_id: employee.id,
      restaurant_id: restaurantId,
      taste_rating: parsed.data.tasteRating,
      speed_rating: parsed.data.speedRating,
      price_rating: parsed.data.priceRating,
      solo_fit_rating: parsed.data.soloFitRating,
      revisit_intent: parsed.data.revisitIntent,
      portion_rating: parsed.data.portionRating ?? null,
      crowdedness_rating: parsed.data.crowdednessRating ?? null,
      group_fit_rating: parsed.data.groupFitRating ?? null,
      cleanliness_rating: parsed.data.cleanlinessRating ?? null,
      tags: parsed.data.tags && parsed.data.tags.length > 0 ? parsed.data.tags : null,
      one_line_review: parsed.data.oneLineReview ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "employee_id,restaurant_id" }
  );

  if (error) {
    throw new Error("리뷰 저장에 실패했습니다.");
  }

  redirect(`/restaurants/${restaurantId}?reviewStatus=saved`);
}

export async function uploadReviewPhoto(restaurantId: string, formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/reviews/new?restaurantId=${restaurantId}`)}`);
  }

  const supabase = createServiceRoleClient();
  const { data: review } = await supabase
    .from("reviews")
    .select("id, employee_id")
    .eq("employee_id", employee.id)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!review || review.employee_id !== employee.id) {
    redirectToPhotoForm(restaurantId, "not_author");
  }

  const existingCount = await countReviewPhotos(review.id);
  if (existingCount >= MAX_PHOTOS_PER_REVIEW) {
    redirectToPhotoForm(restaurantId, "too_many");
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    redirectToPhotoForm(restaurantId, "no_file");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    redirectToPhotoForm(restaurantId, "too_large");
  }
  if (!isAllowedPhotoMimeType(file.type)) {
    redirectToPhotoForm(restaurantId, "invalid_type");
  }

  const originalBuffer = Buffer.from(await file.arrayBuffer());
  let processedBuffer: Buffer;
  try {
    processedBuffer = await processPhotoBuffer(originalBuffer, file.type);
  } catch {
    redirectToPhotoForm(restaurantId, "invalid_type");
  }

  const storagePath = buildPhotoStoragePath(review.id, file.type, crypto.randomUUID());
  const { error: uploadError } = await supabase.storage
    .from(REVIEW_PHOTOS_BUCKET)
    .upload(storagePath, processedBuffer, { contentType: file.type });

  if (uploadError) {
    throw new Error("사진 업로드에 실패했습니다.");
  }

  const { error: insertError } = await supabase.from("review_photos").insert({
    review_id: review.id,
    employee_id: employee.id,
    storage_path: storagePath,
  });

  if (insertError) {
    await supabase.storage.from(REVIEW_PHOTOS_BUCKET).remove([storagePath]);
    throw new Error("사진 등록에 실패했습니다.");
  }

  redirectToPhotoForm(restaurantId, "uploaded");
}

export async function deleteReviewPhoto(photoId: string, restaurantId: string) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/reviews/new?restaurantId=${restaurantId}`)}`);
  }

  const photo = await getPhotoForOwnershipCheck(photoId);
  if (!photo) {
    redirectToPhotoForm(restaurantId, "not_found");
  }
  if (photo.employeeId !== employee.id) {
    redirectToPhotoForm(restaurantId, "not_author");
  }

  const supabase = createServiceRoleClient();
  await supabase.storage.from(REVIEW_PHOTOS_BUCKET).remove([photo.storagePath]);
  await supabase.from("review_photos").delete().eq("id", photoId);

  redirectToPhotoForm(restaurantId, "deleted");
}
