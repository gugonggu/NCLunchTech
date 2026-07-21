import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export interface RepeatReporter {
  employeeId: string;
  employeeNickname: string;
  count: number;
}

/**
 * 최근 sinceDate 이후 신고(리뷰+댓글 합산)를 minCount건 이상 제출한 직원을 건수 내림차순으로 반환한다.
 * 관리자 화면에서 반복 신고 여부를 확인하는 용도(자동 제재 없음, 확인만).
 */
export async function getRepeatReporters(sinceDate: Date, minCount: number): Promise<RepeatReporter[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("reports")
    .select("reporter_employee_id, employees(nickname)")
    .gte("created_at", sinceDate.toISOString());

  const counts = new Map<string, { nickname: string; count: number }>();
  for (const row of data ?? []) {
    const employee = row.employees as unknown as { nickname: string } | null;
    const entry = counts.get(row.reporter_employee_id) ?? {
      nickname: employee?.nickname ?? "(알 수 없음)",
      count: 0,
    };
    entry.count += 1;
    counts.set(row.reporter_employee_id, entry);
  }

  return [...counts.entries()]
    .filter(([, entry]) => entry.count >= minCount)
    .map(([employeeId, entry]) => ({ employeeId, employeeNickname: entry.nickname, count: entry.count }))
    .sort((a, b) => b.count - a.count);
}
