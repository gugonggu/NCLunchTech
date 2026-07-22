export const LUNCH_AVAILABILITY_OPTIONS = [
  { value: "looking_for_company", label: "같이 먹을 사람을 구해요" },
  { value: "has_appointment", label: "이미 약속이 있어요" },
  { value: "eating_alone", label: "오늘은 혼자 먹어요" },
  { value: "away_or_skipping", label: "외근 또는 점심을 먹지 않아요" },
] as const;

export type LunchAvailabilityStatus = (typeof LUNCH_AVAILABILITY_OPTIONS)[number]["value"];

export interface LunchAvailability {
  employeeId: string;
  nickname: string;
  status: LunchAvailabilityStatus;
}

export function isLunchAvailabilityStatus(value: string): value is LunchAvailabilityStatus {
  return LUNCH_AVAILABILITY_OPTIONS.some((option) => option.value === value);
}

export function groupLunchAvailabilities(rows: LunchAvailability[]) {
  return LUNCH_AVAILABILITY_OPTIONS.map((option) => ({
    status: option.value,
    employees: rows.filter((row) => row.status === option.value).map(({ employeeId, nickname }) => ({ employeeId, nickname })),
  }));
}
