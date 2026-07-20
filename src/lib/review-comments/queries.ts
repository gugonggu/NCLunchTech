import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export interface ReviewComment {
  id: string;
  employeeId: string;
  employeeNickname: string;
  content: string;
  createdAt: string;
}

/** 삭제되지 않은 댓글만 작성 순으로 반환한다. */
export async function getComments(reviewId: string): Promise<ReviewComment[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("review_comments")
    .select("id, employee_id, content, created_at, employees(nickname)")
    .eq("review_id", reviewId)
    .is("deleted_at", null)
    .order("created_at");

  return (data ?? []).map((row) => {
    const employee = row.employees as unknown as { nickname: string } | null;
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeNickname: employee?.nickname ?? "(알 수 없음)",
      content: row.content,
      createdAt: row.created_at,
    };
  });
}

export interface CommentOwnership {
  id: string;
  reviewId: string;
  employeeId: string;
}

/** 수정·삭제 권한 확인용: 삭제되지 않은 댓글이면서 작성자 정보를 함께 반환한다. */
export async function getCommentForOwnershipCheck(commentId: string): Promise<CommentOwnership | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("review_comments")
    .select("id, review_id, employee_id")
    .eq("id", commentId)
    .is("deleted_at", null)
    .maybeSingle();

  return data ? { id: data.id, reviewId: data.review_id, employeeId: data.employee_id } : null;
}
