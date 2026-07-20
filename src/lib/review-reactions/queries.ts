import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function getHelpfulCount(reviewId: string): Promise<number> {
  const supabase = createServiceRoleClient();
  const { count } = await supabase
    .from("review_reactions")
    .select("*", { count: "exact", head: true })
    .eq("review_id", reviewId);

  return count ?? 0;
}

export async function hasReacted(employeeId: string, reviewId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("review_reactions")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("review_id", reviewId)
    .maybeSingle();

  return !!data;
}

/** 도움돼요 토글: 이미 눌렀으면 취소, 아니면 추가. */
export async function toggleReaction(employeeId: string, reviewId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from("review_reactions")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("review_id", reviewId)
    .maybeSingle();

  if (existing) {
    await supabase.from("review_reactions").delete().eq("id", existing.id);
  } else {
    await supabase.from("review_reactions").insert({ employee_id: employeeId, review_id: reviewId });
  }
}
