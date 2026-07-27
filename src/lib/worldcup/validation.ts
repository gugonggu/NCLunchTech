export type WorldcupSessionStatus = "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
export type WorldcupGameType = "MENU" | "RESTAURANT";

export function isWorldcupGameType(value: string): value is WorldcupGameType {
  return value === "MENU" || value === "RESTAURANT";
}

export const MIN_CANDIDATES_TO_START = 4;
export const MAX_MENUS_PER_RESTAURANT = 2;
export const MAX_MENUS_PER_CATEGORY = 3;

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const WORLDCUP_STATUS_MESSAGES = {
  started: "월드컵을 시작했어요.",
  resumed: "이어서 진행할게요.",
  not_enough_candidates: "아직 월드컵을 진행할 메뉴가 부족해요.",
  invalid_selection: "선택할 수 없는 메뉴예요.",
  already_selected: "이미 선택을 마친 경기예요.",
  not_found: "월드컵 세션을 찾을 수 없어요.",
  abandoned: "월드컵을 새로 시작했어요.",
} as const;

export type WorldcupStatusCode = keyof typeof WORLDCUP_STATUS_MESSAGES;

export function isWorldcupStatusCode(value: string | undefined): value is WorldcupStatusCode {
  return !!value && Object.prototype.hasOwnProperty.call(WORLDCUP_STATUS_MESSAGES, value);
}
