"use server";

import { redirect } from "next/navigation";
import { adminUuidSchema } from "@/lib/admin/validation";
import { parseAdminRpcObjectStatus, parseAdminRpcStatus } from "@/lib/admin/rpc-result";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getStoragePathsForReviews } from "@/lib/review-photos/queries";
import { REVIEW_PHOTOS_BUCKET } from "@/lib/review-photos/validation";
import { createNotification } from "@/lib/notifications/queries";
import { buildReportResolvedMessage, type ReportTargetType } from "@/lib/notifications/validation";

interface ReportContext {
  reporterEmployeeId: string;
  reason: string;
  targetType: ReportTargetType;
  restaurantName: string;
}

/** 신고 처리 결과 알림에 쓸 맥락(리포터·사유·대상 종류·식당명)을 RPC 호출 전에 미리 조회한다. */
async function getReportContext(
  supabase: ReturnType<typeof createServiceRoleClient>,
  reportId: string
): Promise<ReportContext | null> {
  const { data } = await supabase
    .from("reports")
    .select(
      "reporter_employee_id, reason, review_id, comment_id, reviews(restaurants(name)), review_comments(reviews(restaurants(name)))"
    )
    .eq("id", reportId)
    .eq("status", "pending")
    .maybeSingle();

  if (!data) {
    return null;
  }

  if (data.review_id) {
    const review = data.reviews as unknown as { restaurants: { name: string } | null } | null;
    const restaurantName = review?.restaurants?.name;
    if (!restaurantName) {
      return null;
    }
    return {
      reporterEmployeeId: data.reporter_employee_id,
      reason: data.reason,
      targetType: "review",
      restaurantName,
    };
  }

  if (data.comment_id) {
    const comment = data.review_comments as unknown as {
      reviews: { restaurants: { name: string } | null } | null;
    } | null;
    const restaurantName = comment?.reviews?.restaurants?.name;
    if (!restaurantName) {
      return null;
    }
    return {
      reporterEmployeeId: data.reporter_employee_id,
      reason: data.reason,
      targetType: "comment",
      restaurantName,
    };
  }

  return null;
}

async function notifyReporter(context: ReportContext | null, outcome: "dismissed" | "deleted") {
  if (!context) {
    return;
  }
  await createNotification({
    employeeId: context.reporterEmployeeId,
    type: "report_resolved",
    message: buildReportResolvedMessage({
      targetType: context.targetType,
      restaurantName: context.restaurantName,
      reason: context.reason,
      outcome,
    }),
  });
}

export async function dismissReport(reportId: string) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  if (!adminUuidSchema.safeParse(reportId).success) {
    redirect("/admin/reports?status=invalid_target");
  }

  const supabase = createServiceRoleClient();
  const context = await getReportContext(supabase, reportId);

  const { data, error } = await supabase.rpc("admin_dismiss_report", {
    p_admin_id: admin.id,
    p_report_id: reportId,
  });

  if (error) {
    throw new Error("신고 처리에 실패했습니다.");
  }
  const status = parseAdminRpcStatus(data, ["dismissed", "target_not_found"]);

  if (status === "dismissed") {
    await notifyReporter(context, "dismissed");
  }

  redirect(`/admin/reports?status=${status}`);
}

export async function deleteReportedReview(reportId: string) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  if (!adminUuidSchema.safeParse(reportId).success) {
    redirect("/admin/reports?status=invalid_target");
  }

  const supabase = createServiceRoleClient();
  const context = await getReportContext(supabase, reportId);

  const { data: report } = await supabase
    .from("reports")
    .select("review_id")
    .eq("id", reportId)
    .eq("status", "pending")
    .maybeSingle();

  if (report?.review_id) {
    const storagePaths = await getStoragePathsForReviews([report.review_id]);
    if (storagePaths.length > 0) {
      await supabase.storage.from(REVIEW_PHOTOS_BUCKET).remove(storagePaths);
    }
  }

  const { data, error } = await supabase.rpc("admin_delete_reported_review", {
    p_admin_id: admin.id,
    p_report_id: reportId,
  });
  if (error) {
    throw new Error("리뷰 삭제에 실패했습니다.");
  }
  const status = parseAdminRpcObjectStatus(data, ["review_deleted", "target_not_found"]);

  if (status === "review_deleted") {
    await notifyReporter(context, "deleted");
  }

  redirect(`/admin/reports?status=${status}`);
}

export async function deleteReportedComment(reportId: string) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  if (!adminUuidSchema.safeParse(reportId).success) {
    redirect("/admin/reports?status=invalid_target");
  }

  const supabase = createServiceRoleClient();
  const context = await getReportContext(supabase, reportId);

  const { data, error } = await supabase.rpc("admin_delete_reported_comment", {
    p_admin_id: admin.id,
    p_report_id: reportId,
  });
  if (error) {
    throw new Error("댓글 삭제에 실패했습니다.");
  }
  const status = parseAdminRpcObjectStatus(data, ["comment_deleted", "target_not_found"]);

  if (status === "comment_deleted") {
    await notifyReporter(context, "deleted");
  }

  redirect(`/admin/reports?status=${status}`);
}
