/**
 * "여기로 결정" 시 오늘의 기존 planned 방문(있다면)을 바탕으로 다음에 할 DB 작업을 판정한다.
 * completed/cancelled 방문은 이미 "오늘의 활성 결정"이 아니므로 이 함수에 전달되지 않는다
 * (호출부가 오늘의 planned 행만 조회해서 넘긴다는 전제).
 */
export interface ExistingPlannedVisit {
  id: string;
  restaurantId: string;
}

export type DecideOutcome =
  | { action: "insert" }
  | { action: "update_restaurant"; visitId: string }
  | { action: "already_decided"; visitId: string };

export function decideOutcome(
  existingPlanned: ExistingPlannedVisit | null,
  restaurantId: string
): DecideOutcome {
  if (!existingPlanned) {
    return { action: "insert" };
  }

  if (existingPlanned.restaurantId === restaurantId) {
    return { action: "already_decided", visitId: existingPlanned.id };
  }

  return { action: "update_restaurant", visitId: existingPlanned.id };
}
