import { describe, expect, it } from "vitest";
import {
  buildAppointmentCancelledMessage,
  buildAppointmentInvitedMessage,
  buildAppointmentUpdatedMessage,
  buildPollClosedMessage,
  buildPollDecidedMessage,
  buildReportResolvedMessage,
} from "./validation";

describe("알림 메시지 생성", () => {
  it("초대 메시지에 식당 이름이 들어간다", () => {
    expect(buildAppointmentInvitedMessage("더차이나")).toBe("더차이나에서의 약속에 초대되었어요.");
  });

  it("변경 메시지에 식당 이름이 들어간다", () => {
    expect(buildAppointmentUpdatedMessage("더차이나")).toBe("더차이나 약속 정보가 변경되었어요.");
  });

  it("취소 메시지에 식당 이름이 들어간다", () => {
    expect(buildAppointmentCancelledMessage("더차이나")).toBe("더차이나 약속이 취소되었어요.");
  });

  it("투표 마감 메시지에 식당 이름이 들어간다", () => {
    expect(buildPollClosedMessage("더차이나")).toBe(
      "더차이나 약속의 메뉴 투표가 마감됐어요. 결과 확정을 기다려주세요."
    );
  });

  it("투표 결정 메시지에 식당 이름과 결정된 메뉴가 들어간다", () => {
    expect(buildPollDecidedMessage("더차이나", "짜장면")).toBe(
      "더차이나 약속의 메뉴가 '짜장면'(으)로 결정됐어요."
    );
  });
});

describe("buildReportResolvedMessage", () => {
  it("리뷰 신고 기각 메시지에 식당·사유가 들어간다", () => {
    const message = buildReportResolvedMessage({
      targetType: "review",
      restaurantName: "더차이나",
      reason: "허위 정보로 보여요",
      outcome: "dismissed",
    });
    expect(message).toBe("더차이나 리뷰 신고('허위 정보로 보여요')가 검토 후 기각됐어요.");
  });

  it("댓글 신고 삭제 메시지는 '댓글'과 삭제 처리 문구를 쓴다", () => {
    const message = buildReportResolvedMessage({
      targetType: "comment",
      restaurantName: "더차이나",
      reason: "욕설이 있어요",
      outcome: "deleted",
    });
    expect(message).toBe("더차이나 댓글 신고('욕설이 있어요')가 삭제 처리됐어요.");
  });
});
