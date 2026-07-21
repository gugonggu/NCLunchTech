export type NotificationType =
  | "appointment_invited"
  | "appointment_updated"
  | "appointment_cancelled"
  | "poll_invited"
  | "review_commented"
  | "poll_closed"
  | "poll_decided"
  | "report_resolved"
  | "settlement_created"
  | "settlement_updated";

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

export function buildPollClosedMessage(restaurantName: string): string {
  return `${restaurantName} 약속의 메뉴 투표가 마감됐어요. 결과 확정을 기다려주세요.`;
}

export function buildPollDecidedMessage(restaurantName: string, decidedLabel: string): string {
  return `${restaurantName} 약속의 메뉴가 '${decidedLabel}'(으)로 결정됐어요.`;
}

export type ReportTargetType = "review" | "comment" | "restaurant";
export type ReportOutcome = "dismissed" | "deleted";

const REPORT_TARGET_LABELS: Record<ReportTargetType, string> = {
  review: "리뷰",
  comment: "댓글",
  restaurant: "식당 정보",
};

/** 신고 처리 결과 알림(사유·내용 포함). 신고자 본인에게만 발송한다. */
export function buildReportResolvedMessage(params: {
  targetType: ReportTargetType;
  restaurantName: string;
  reason: string;
  outcome: ReportOutcome;
}): string {
  const targetLabel = REPORT_TARGET_LABELS[params.targetType];
  const outcomeLabel = params.outcome === "deleted" ? "삭제 처리됐어요" : "검토 후 기각됐어요";
  return `${params.restaurantName} ${targetLabel} 신고('${params.reason}')가 ${outcomeLabel}.`;
}

export function buildSettlementCreatedMessage(restaurantName: string): string {
  return `${restaurantName} 약속의 정산이 등록됐어요. 내 부담액을 확인해보세요.`;
}

export function buildSettlementUpdatedMessage(restaurantName: string): string {
  return `${restaurantName} 약속의 정산 내용이 변경됐어요. 다시 확인해보세요.`;
}
