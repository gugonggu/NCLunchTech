"use server";

import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hasCompletedVisit } from "@/lib/reviews/queries";
import { normalizeReviewFormData, reviewSchema } from "@/lib/reviews/validation";

function redirectToForm(restaurantId: string, status: string): never {
  redirect(`/reviews/new?restaurantId=${restaurantId}&status=${status}`);
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
