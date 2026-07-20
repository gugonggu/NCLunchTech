export type NotificationType =
  | "appointment_invited"
  | "appointment_updated"
  | "appointment_cancelled"
  | "poll_invited"
  | "review_commented";

export function buildAppointmentInvitedMessage(restaurantName: string): string {
  return `${restaurantName}에서의 약속에 초대되었어요.`;
}

export function buildAppointmentUpdatedMessage(restaurantName: string): string {
  return `${restaurantName} 약속 정보가 변경되었어요.`;
}

export function buildAppointmentCancelledMessage(restaurantName: string): string {
  return `${restaurantName} 약속이 취소되었어요.`;
}

export function buildPollInvitedMessage(restaurantName: string): string {
  return `${restaurantName} 약속에 메뉴 투표가 생겼어요.`;
}

export function buildReviewCommentedMessage(restaurantName: string): string {
  return `${restaurantName} 리뷰에 댓글이 달렸어요.`;
}
