export const EMPLOYEE_STATUS_MESSAGES = {
  invalid_target: "올바르지 않은 직원 식별자예요.",
  pin_invalid: "PIN은 숫자 4자리여야 해요.",
  target_not_found: "직원을 찾을 수 없어요.",
  pin_reset: "PIN을 초기화했어요.",
  deactivated: "직원을 비활성화했어요.",
  reactivated: "직원을 재활성화했어요.",
} as const;

export const REPORT_STATUS_MESSAGES = {
  invalid_target: "올바르지 않은 신고 식별자예요.",
  target_not_found: "대기 중인 신고를 찾을 수 없어요.",
  dismissed: "신고를 기각했어요.",
  review_deleted: "신고된 리뷰를 삭제했어요.",
} as const;

export const RESTAURANT_ADMIN_STATUS_MESSAGES = {
  invalid_target: "올바르지 않은 식당 또는 메뉴 식별자예요.",
  target_not_found: "변경할 대상을 찾을 수 없어요.",
  updated: "설정을 변경했어요.",
  restored: "복구했어요.",
  no_history: "복구할 이전 이력이 없어요.",
  invalid_history: "변경 이력 데이터가 올바르지 않아 복구할 수 없어요.",
} as const;

export const SETTINGS_STATUS_MESSAGES = {
  invite_code_invalid: "초대코드는 제어문자 없이 4~64자로 입력해주세요.",
  coords_invalid: "회사 좌표와 기본 반경을 확인해주세요.",
  announcement_invalid: "공지는 200자 이하로 입력해주세요.",
  settings_not_found: "설정 행을 찾을 수 없어요.",
  invite_code_updated: "초대코드를 변경했어요.",
  coords_updated: "회사 좌표와 기본 반경을 변경했어요.",
  announcement_updated: "공지를 변경했어요.",
} as const;

export function getAdminStatusMessage(
  messages: Readonly<Record<string, string>>,
  status: string | undefined
): string | null {
  return status && Object.prototype.hasOwnProperty.call(messages, status) ? messages[status] : null;
}
