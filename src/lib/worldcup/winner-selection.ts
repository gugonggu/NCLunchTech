import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** Asia/Seoul(UTC+9, 서머타임 없음) 기준 "오늘 hour시 정각"에 해당하는 UTC 시각을 계산한다. */
export function getSeoulCutoffToday(now: Date, hour: number): Date {
  const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;
  const seoulNow = new Date(now.getTime() + SEOUL_OFFSET_MS);
  const seoulCutoff = Date.UTC(seoulNow.getUTCFullYear(), seoulNow.getUTCMonth(), seoulNow.getUTCDate(), hour, 0, 0, 0);
  return new Date(seoulCutoff - SEOUL_OFFSET_MS);
}

/** 월드컵 우승 메뉴/식당 연동 선택의 유효 시각(당일 17:00 KST까지). */
export const WORLDCUP_WINNER_SELECTION_CUTOFF_HOUR = 17;

export function isWithinWorldcupWinnerSelectionWindow(now: Date): boolean {
  return now.getTime() <= getSeoulCutoffToday(now, WORLDCUP_WINNER_SELECTION_CUTOFF_HOUR).getTime();
}

/**
 * 월드컵 결과 화면에서 "이 식당으로 결정"을 눌렀을 때, 그 선택이 당일 17시 이전이면 연결 기록을
 * 남긴다(우승 메뉴 실행력 업적 판정용). 17시 이후 선택은 기록하지 않는다(달성 대상에서 자연히 제외).
 */
export async function recordWorldcupWinnerSelection(
  employeeId: string,
  sessionId: string,
  restaurantId: string,
  now = new Date()
): Promise<void> {
  if (!isWithinWorldcupWinnerSelectionWindow(now)) {
    return;
  }

  const supabase = createServiceRoleClient();
  await supabase.from("worldcup_winner_selections").insert({
    employee_id: employeeId,
    worldcup_session_id: sessionId,
    restaurant_id: restaurantId,
    selected_at: now.toISOString(),
  });
}

/** 오늘(visitDate) 완료된 방문의 식당이, 오늘 17시 이전에 연결된 월드컵 우승 선택과 일치하는지 확인한다. */
export async function hasValidWorldcupWinnerSelection(
  employeeId: string,
  restaurantId: string,
  visitDate: string
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const dayStart = `${visitDate}T00:00:00+09:00`;
  const dayEnd = `${visitDate}T23:59:59.999+09:00`;

  const { count } = await supabase
    .from("worldcup_winner_selections")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", employeeId)
    .eq("restaurant_id", restaurantId)
    .gte("selected_at", dayStart)
    .lte("selected_at", dayEnd);

  return (count ?? 0) > 0;
}
