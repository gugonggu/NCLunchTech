import "server-only";
import { requireQuerySuccess } from "@/lib/admin/db-result";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function logAdminAction(
  adminId: string,
  action: string,
  options?: { targetType?: string; targetId?: string; detail?: Record<string, unknown> }
) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("admin_logs").insert({
    admin_id: adminId,
    action,
    target_type: options?.targetType ?? null,
    target_id: options?.targetId ?? null,
    detail: options?.detail ?? null,
  });

  requireQuerySuccess(error, "관리자 작업 로그 저장에 실패했습니다.");
}
