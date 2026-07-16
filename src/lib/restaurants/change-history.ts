import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function logChange(params: {
  entityType: string;
  entityId: string;
  action: "create" | "update";
  changedBy: string;
  before?: unknown;
  after: unknown;
}) {
  const supabase = createServiceRoleClient();
  await supabase.from("change_history").insert({
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: params.action,
    changed_by: params.changedBy,
    before: params.before ?? null,
    after: params.after,
  });
}
