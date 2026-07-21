import { getSeoulDateString } from "@/lib/visits/validation";

export type ReportType = "congestion" | "business_status";

export const CONGESTION_VALUES = ["한산", "보통", "혼잡"] as const;
export type CongestionValue = (typeof CONGESTION_VALUES)[number];

export const BUSINESS_STATUS_VALUES = ["영업 중", "조기 마감", "재료 소진", "임시 휴무"] as const;
export type BusinessStatusValue = (typeof BUSINESS_STATUS_VALUES)[number];

/** 영업 상태 제보 중 이 값들은 추천에서 신선하면 완전히 제외한다("영업 중"은 제외 대상이 아니다). */
export const EXCLUDING_BUSINESS_STATUS_VALUES: readonly BusinessStatusValue[] = [
  "조기 마감",
  "재료 소진",
  "임시 휴무",
];

export const CONGESTION_VALID_MINUTES = 60;
export const BUSINESS_STATUS_VALID_MINUTES = 180;
export const REPORT_EDIT_WINDOW_MINUTES = 10;

export function isValidReportValue(reportType: ReportType, value: string): boolean {
  if (reportType === "congestion") {
    return (CONGESTION_VALUES as readonly string[]).includes(value);
  }
  return (BUSINESS_STATUS_VALUES as readonly string[]).includes(value);
}

/**
 * 제보가 지금 시점에 유효(신선)한지 판단한다: 유형별 유효 시간 이내이면서,
 * 당일 자정이 지나면(Asia/Seoul 기준 날짜가 바뀌면) 그 전에 무조건 만료된다.
 */
export function isReportFresh(reportType: ReportType, createdAt: Date, now: Date): boolean {
  if (getSeoulDateString(createdAt) !== getSeoulDateString(now)) {
    return false;
  }
  const validMinutes = reportType === "congestion" ? CONGESTION_VALID_MINUTES : BUSINESS_STATUS_VALID_MINUTES;
  const ageMs = now.getTime() - createdAt.getTime();
  return ageMs >= 0 && ageMs <= validMinutes * 60 * 1000;
}

/** 직원 본인의 직전 제보를 새로 만들지 않고 수정으로 처리해야 하는지 판단한다(반복 제보 방지 겸용). */
export function shouldEditExistingReport(lastReportedAt: Date, now: Date): boolean {
  const ageMs = now.getTime() - lastReportedAt.getTime();
  return ageMs >= 0 && ageMs <= REPORT_EDIT_WINDOW_MINUTES * 60 * 1000;
}

/** 제보 폼(useActionState) 결과 상태. 리다이렉트 없이 같은 화면에서 성공/실패를 안내하기 위함. */
export interface StatusReportActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export const STATUS_REPORT_IDLE_STATE: StatusReportActionState = { status: "idle" };

/** 제보 시각을 "N분 전"/"H시간 N분 전"으로 표시한다(음수·미래 시각은 "방금 전"으로 취급). */
export function formatMinutesAgo(createdAt: Date, now: Date): string {
  const totalMinutes = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / (60 * 1000)));
  if (totalMinutes < 1) {
    return "방금 전";
  }
  if (totalMinutes < 60) {
    return `${totalMinutes}분 전`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}시간 전` : `${hours}시간 ${minutes}분 전`;
}
