"use server";

import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  reportReasonSchema,
  restaurantReportCategorySchema,
  restaurantReportNoteSchema,
} from "@/lib/reports/validation";

function redirectToForm(reviewId: string, status: string): never {
  redirect(`/reports/new?reviewId=${reviewId}&status=${status}`);
}

function redirectToCommentForm(commentId: string, status: string): never {
  redirect(`/reports/new?commentId=${commentId}&status=${status}`);
}

function redirectToRestaurantForm(restaurantId: string, status: string): never {
  redirect(`/reports/new?restaurantId=${restaurantId}&status=${status}`);
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

/**
 * 식당 정보 최신성 제보(정보 오래됨/가격 변경/메뉴 삭제/영업시간 변경/폐업 추정/중복 식당).
 * 자동으로 식당 데이터에 반영되지 않고, 관리자가 검토 후 처리한다.
 */
export async function createRestaurantReport(restaurantId: string, formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/reports/new?restaurantId=${restaurantId}`)}`);
  }

  const supabase = createServiceRoleClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .maybeSingle();

  if (!restaurant) {
    redirectToRestaurantForm(restaurantId, "not_found");
  }

  const parsedCategory = restaurantReportCategorySchema.safeParse(formData.get("category"));
  if (!parsedCategory.success) {
    redirectToRestaurantForm(restaurantId, "invalid_category");
  }

  const parsedNote = restaurantReportNoteSchema.safeParse(String(formData.get("note") ?? ""));
  const note = parsedNote.success ? parsedNote.data : "";

  const { error } = await supabase.from("reports").insert({
    reporter_employee_id: employee.id,
    restaurant_id: restaurantId,
    category: parsedCategory.data,
    reason: note,
  });

  if (error) {
    if (error.code === "23505") {
      redirectToRestaurantForm(restaurantId, "already_reported");
    }
    throw new Error("제보 접수에 실패했습니다.");
  }

  redirectToRestaurantForm(restaurantId, "submitted");
}

export async function createCommentReport(commentId: string, formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/reports/new?commentId=${commentId}`)}`);
  }

  const supabase = createServiceRoleClient();
  const { data: comment } = await supabase
    .from("review_comments")
    .select("id, employee_id, reviews(restaurant_id)")
    .eq("id", commentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!comment) {
    redirectToCommentForm(commentId, "not_found");
  }
  if (comment.employee_id === employee.id) {
    redirectToCommentForm(commentId, "own_review");
  }

  const review = comment.reviews as unknown as { restaurant_id: string } | null;
  if (!review) {
    redirectToCommentForm(commentId, "not_found");
  }

  const parsed = reportReasonSchema.safeParse(formData.get("reason"));
  if (!parsed.success) {
    redirectToCommentForm(commentId, "invalid_reason");
  }

  const { error } = await supabase.from("reports").insert({
    reporter_employee_id: employee.id,
    comment_id: commentId,
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
