"use server";

import { redirect } from "next/navigation";
import { adminUuidSchema } from "@/lib/admin/validation";
import { parseAdminRpcObjectStatus, parseAdminRpcStatus } from "@/lib/admin/rpc-result";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function dismissReport(reportId: string) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  if (!adminUuidSchema.safeParse(reportId).success) {
    redirect("/admin/reports?status=invalid_target");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("admin_dismiss_report", {
    p_admin_id: admin.id,
    p_report_id: reportId,
  });

  if (error) {
    throw new Error("신고 처리에 실패했습니다.");
  }
  const status = parseAdminRpcStatus(data, ["dismissed", "target_not_found"]);
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

  const { data, error } = await supabase.rpc("admin_delete_reported_review", {
    p_admin_id: admin.id,
    p_report_id: reportId,
  });
  if (error) {
    throw new Error("리뷰 삭제에 실패했습니다.");
  }
  const status = parseAdminRpcObjectStatus(data, ["review_deleted", "target_not_found"]);
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

  const { data, error } = await supabase.rpc("admin_delete_reported_comment", {
    p_admin_id: admin.id,
    p_report_id: reportId,
  });
  if (error) {
    throw new Error("댓글 삭제에 실패했습니다.");
  }
  const status = parseAdminRpcObjectStatus(data, ["comment_deleted", "target_not_found"]);
  redirect(`/admin/reports?status=${status}`);
}
