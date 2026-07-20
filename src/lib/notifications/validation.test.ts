import { describe, expect, it } from "vitest";
import {
  buildAppointmentCancelledMessage,
  buildAppointmentInvitedMessage,
  buildAppointmentUpdatedMessage,
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
});
