export type PollType = "restaurant" | "menu";
export type PollStatus = "open" | "closed" | "decided";

export const MAX_POLL_OPTIONS = 10;
export const CUSTOM_OPTION_LABEL_MAX_LENGTH = 50;

/** 마감시각이 지난 open 투표는 조회 시점에 closed로 지연 반영해야 한다(0013 lazy update와 동일 패턴). */
export function shouldLazyClose(status: PollStatus, closesAt: Date, now: Date): boolean {
  return status === "open" && closesAt <= now;
}

export interface PollOptionTally {
  optionId: string;
  voteCount: number;
}

/** 최다 득표 선택지 id들을 반환한다(동점이면 여러 개, 투표가 하나도 없으면 빈 배열). */
export function getWinningOptionIds(tallies: PollOptionTally[]): string[] {
  if (tallies.length === 0) {
    return [];
  }
  const maxVotes = Math.max(...tallies.map((t) => t.voteCount));
  if (maxVotes === 0) {
    return [];
  }
  return tallies.filter((t) => t.voteCount === maxVotes).map((t) => t.optionId);
}

export const POLL_STATUS_MESSAGES = {
  created: "투표를 만들었어요.",
  voted: "투표했어요.",
  vote_changed: "투표를 변경했어요.",
  vote_cancelled: "투표를 취소했어요.",
  closed: "투표를 마감했어요.",
  decided: "결과를 확정했어요.",
  not_found: "존재하지 않는 투표예요.",
  not_creator: "투표를 만든 사람만 할 수 있는 작업이에요.",
  already_closed: "이미 마감된 투표라 더 이상 투표할 수 없어요.",
  not_closed: "마감 후에만 결과를 확정할 수 있어요.",
  already_decided: "이미 결과가 확정된 투표예요.",
  invalid_option: "선택할 수 없는 항목이에요.",
  invalid_input: "입력값을 다시 확인해주세요.",
  inactive_restaurant: "운영하지 않는 식당이라 투표를 만들 수 없어요.",
  invalid_closes_at: "마감 시각은 현재보다 미래여야 해요.",
  too_few_options: "선택지를 1개 이상 골라주세요.",
  too_many_options: `선택지는 최대 ${MAX_POLL_OPTIONS}개까지 가능해요.`,
  not_eligible_voter: "이 약속에서 수락한 참여자만 투표할 수 있어요.",
} as const;

export type PollStatusCode = keyof typeof POLL_STATUS_MESSAGES;

export function isPollStatusCode(value: string | undefined): value is PollStatusCode {
  return !!value && Object.prototype.hasOwnProperty.call(POLL_STATUS_MESSAGES, value);
}

/** 체크박스로 전달된 식당 id 목록을 정리한다(중복 제거, 개수는 호출부에서 검증). */
export function dedupeIds(raw: FormDataEntryValue[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of raw) {
    const id = String(value).trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

/** 직접 입력 선택지 목록을 정리한다(공백 제거, 빈 값 제거, 길이 제한 초과 제거). */
export function sanitizeCustomLabels(raw: FormDataEntryValue[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of raw) {
    const label = String(value).trim();
    if (label && label.length <= CUSTOM_OPTION_LABEL_MAX_LENGTH && !seen.has(label)) {
      seen.add(label);
      result.push(label);
    }
  }
  return result;
}

/**
 * 결정된 독립 식당 투표의 결과로 약속을 만들어도 되는지 검증한다(2-2 브릿지).
 * 식당 투표이면서, 결과가 확정됐고, 아직 다른 약속에 연결되지 않았으며,
 * 결정된 선택지의 식당이 실제로 요청된 식당과 일치해야 한다(주소창 조작 방지).
 */
export function isValidRestaurantPollBridge(params: {
  pollType: PollType;
  status: PollStatus;
  appointmentId: string | null;
  decidedOptionRestaurantId: string | null | undefined;
  targetRestaurantId: string;
}): boolean {
  return (
    params.pollType === "restaurant" &&
    params.status === "decided" &&
    params.appointmentId === null &&
    !!params.decidedOptionRestaurantId &&
    params.decidedOptionRestaurantId === params.targetRestaurantId
  );
}
