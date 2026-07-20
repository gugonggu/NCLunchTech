"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/auth/admin-log";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function dismissReport(reportId: string) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("reports")
    .update({ status: "resolved" })
    .eq("id", reportId)
    .eq("status", "pending");

  if (error) {
    throw new Error("신고 처리에 실패했습니다.");
  }

  await logAdminAction(admin.id, "dismiss_report", { targetType: "report", targetId: reportId });
  revalidatePath("/admin/reports");
}

export async function deleteReportedReview(reportId: string, reviewId: string) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const supabase = createServiceRoleClient();

  const { data: review } = await supabase.from("reviews").select("*").eq("id", reviewId).maybeSingle();
  if (!review) {
    throw new Error("존재하지 않는 리뷰입니다.");
  }

  // reports.review_id가 reviews(id)를 참조하므로, 리뷰 삭제 전 관련 신고부터 정리한다.
  const { error: reportsError } = await supabase.from("reports").delete().eq("review_id", reviewId);
  if (reportsError) {
    throw new Error("신고 정리에 실패했습니다.");
  }

  const { error: reviewError } = await supabase.from("reviews").delete().eq("id", reviewId);
  if (reviewError) {
    throw new Error("리뷰 삭제에 실패했습니다.");
  }

  await logAdminAction(admin.id, "delete_reported_review", {
    targetType: "review",
    targetId: reviewId,
    detail: { deletedReview: review, viaReportId: reportId },
  });

  revalidatePath("/admin/reports");
}
