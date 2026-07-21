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

/** 식당 정보 최신성 제보 유형. 자동 반영되지 않고 관리자 검토 후 처리된다. */
export const RESTAURANT_REPORT_CATEGORIES = [
  { value: "stale_info", label: "정보가 오래됐어요" },
  { value: "price_changed", label: "가격이 달라요" },
  { value: "menu_gone", label: "메뉴가 사라졌어요" },
  { value: "hours_changed", label: "영업시간이 달라요" },
  { value: "closed_down", label: "폐업했어요" },
  { value: "duplicate_restaurant", label: "중복 식당 같아요" },
] as const;

export type RestaurantReportCategory = (typeof RESTAURANT_REPORT_CATEGORIES)[number]["value"];

const RESTAURANT_REPORT_CATEGORY_VALUES = RESTAURANT_REPORT_CATEGORIES.map((c) => c.value) as [
  RestaurantReportCategory,
  ...RestaurantReportCategory[],
];

export const restaurantReportCategorySchema = z.enum(RESTAURANT_REPORT_CATEGORY_VALUES);

export function getRestaurantReportCategoryLabel(category: string): string {
  return RESTAURANT_REPORT_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

/** 식당 정보 제보의 추가 메모(선택). 리뷰·댓글 신고와 달리 필수가 아니다. */
export const restaurantReportNoteSchema = z
  .string()
  .trim()
  .max(200, "메모는 200자 이하여야 합니다.");

export const RESTAURANT_REPORT_STATUS_MESSAGES = {
  submitted: "제보해주셔서 감사해요. 검토 후 반영할게요.",
  already_reported: "이미 같은 유형으로 제보한 식당이에요.",
  not_found: "존재하지 않는 식당이에요.",
  invalid_category: "제보 유형을 다시 선택해주세요.",
} as const;

export type RestaurantReportStatusCode = keyof typeof RESTAURANT_REPORT_STATUS_MESSAGES;

export function isRestaurantReportStatusCode(value: string | undefined): value is RestaurantReportStatusCode {
  return !!value && Object.prototype.hasOwnProperty.call(RESTAURANT_REPORT_STATUS_MESSAGES, value);
}
