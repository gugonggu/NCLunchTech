import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** 완료된 월드컵 세션들에서, 우승 메뉴 키(정규화된 이름)별 우승 횟수를 센다(순수 함수). */
export function countWinsPerMenuKey(sessions: { winnerMenuKey: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    counts.set(session.winnerMenuKey, (counts.get(session.winnerMenuKey) ?? 0) + 1);
  }
  return counts;
}

/** 이 직원이 완료한 월드컵(메뉴+식당 모두 포함) 중, 가장 많이 우승한 단일 메뉴의 우승 횟수를 구한다. */
export async function getMaxWorldcupMenuWinCount(employeeId: string): Promise<number> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("menu_worldcup_sessions")
    .select("winner_menu_key")
    .eq("employee_id", employeeId)
    .eq("status", "COMPLETED")
    .not("winner_menu_key", "is", null);

  const counts = countWinsPerMenuKey((data ?? []).map((row) => ({ winnerMenuKey: row.winner_menu_key as string })));
  return counts.size === 0 ? 0 : Math.max(...counts.values());
}
