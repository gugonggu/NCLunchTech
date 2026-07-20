import { z } from "zod";

export const reportReasonSchema = z
  .string()
  .trim()
  .min(1, "신고 사유를 입력해주세요.")
  .max(200, "신고 사유는 200자 이하여야 합니다.");

export const REPORT_STATUS_MESSAGES = {
  submitted: "신고가 접수되었어요.",
  already_reported: "이미 신고한 리뷰예요.",
  own_review: "본인이 작성한 리뷰는 신고할 수 없어요.",
  not_found: "존재하지 않는 리뷰예요.",
  invalid_reason: "신고 사유를 다시 확인해주세요.",
} as const;

export type ReportStatusCode = keyof typeof REPORT_STATUS_MESSAGES;

export function isReportStatusCode(value: string | undefined): value is ReportStatusCode {
  return !!value && Object.prototype.hasOwnProperty.call(REPORT_STATUS_MESSAGES, value);
}
