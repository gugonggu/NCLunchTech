import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function logAdminAction(
  adminId: string,
  action: string,
  options?: { targetType?: string; targetId?: string; detail?: Record<string, unknown> }
) {
  const supabase = createServiceRoleClient();
  await supabase.from("admin_logs").insert({
    admin_id: adminId,
    action,
    target_type: options?.targetType ?? null,
    target_id: options?.targetId ?? null,
    detail: options?.detail ?? null,
  });
}
