export type VisitStatus = "planned" | "completed" | "cancelled";

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_TRANSITIONS: Record<VisitStatus, VisitStatus[]> = {
  planned: ["completed", "cancelled"],
  completed: ["cancelled"],
  cancelled: [],
};

export function canTransition(from: VisitStatus, to: VisitStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Asia/Seoul(UTC+9, 서머타임 없음) 기준 오늘 날짜를 YYYY-MM-DD 문자열로 계산한다. */
export function getSeoulDateString(now: Date): string {
  const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;
  const seoul = new Date(now.getTime() + SEOUL_OFFSET_MS);
  const year = seoul.getUTCFullYear();
  const month = String(seoul.getUTCMonth() + 1).padStart(2, "0");
  const day = String(seoul.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 두 YYYY-MM-DD 날짜 문자열 사이의 일수 차이(a - b, 일 단위)를 계산한다. */
export function daysBetweenDateStrings(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const dateA = Date.parse(`${a}T00:00:00Z`);
  const dateB = Date.parse(`${b}T00:00:00Z`);
  return Math.round((dateA - dateB) / msPerDay);
}

/** 홈 화면 ?visitStatus= 로 전달되는 안내 문구. 허용 목록에 없는 값은 화면에 표시하지 않는다. */
export const VISIT_STATUS_MESSAGES = {
  decided: "오늘의 점심으로 결정했어요.",
  changed: "다른 식당으로 변경했어요.",
  already_decided: "이미 이 식당으로 결정되어 있어요.",
  cancelled: "결정을 취소했어요.",
  completed: "방문 완료로 기록했어요.",
  already_completed: "이미 완료 처리된 방문이에요.",
  no_active_visit: "취소하거나 완료할 방문이 없어요.",
  inactive_restaurant: "운영하지 않는 식당이라 결정할 수 없어요.",
  not_found: "존재하지 않는 식당이에요.",
  invalid_id: "식당 정보가 올바르지 않아요.",
  too_early: "결정한 시각에서 1시간 후에 방문을 확인할 수 있어요.",
  no_show: "가지 않았어요로 기록했어요.",
} as const;

export type VisitFeedbackCode = keyof typeof VISIT_STATUS_MESSAGES;

export function isVisitFeedbackCode(value: string | undefined): value is VisitFeedbackCode {
  return !!value && Object.prototype.hasOwnProperty.call(VISIT_STATUS_MESSAGES, value);
}
