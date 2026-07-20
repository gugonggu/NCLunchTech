"use server";

import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { reportReasonSchema } from "@/lib/reports/validation";

function redirectToForm(reviewId: string, status: string): never {
  redirect(`/reports/new?reviewId=${reviewId}&status=${status}`);
}

export async function createReport(reviewId: string, formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/reports/new?reviewId=${reviewId}`)}`);
  }

  const supabase = createServiceRoleClient();
  const { data: review } = await supabase
    .from("reviews")
    .select("id, restaurant_id, employee_id")
    .eq("id", reviewId)
    .maybeSingle();

  if (!review) {
    redirectToForm(reviewId, "not_found");
  }
  if (review.employee_id === employee.id) {
    redirectToForm(reviewId, "own_review");
  }

  const parsed = reportReasonSchema.safeParse(formData.get("reason"));
  if (!parsed.success) {
    redirectToForm(reviewId, "invalid_reason");
  }

  const { error } = await supabase.from("reports").insert({
    reporter_employee_id: employee.id,
    review_id: reviewId,
    reason: parsed.data,
  });

  if (error) {
    if (error.code === "23505") {
      redirect(`/restaurants/${review.restaurant_id}?reportStatus=already_reported`);
    }
    throw new Error("신고 접수에 실패했습니다.");
  }

  redirect(`/restaurants/${review.restaurant_id}?reportStatus=submitted`);
}
