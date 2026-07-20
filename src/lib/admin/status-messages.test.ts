import { describe, expect, it } from "vitest";
import { EMPLOYEE_STATUS_MESSAGES, getAdminStatusMessage, SETTINGS_STATUS_MESSAGES } from "./status-messages";

describe("getAdminStatusMessage", () => {
  it("허용된 상태 코드만 사용자 메시지로 바꾼다", () => {
    expect(getAdminStatusMessage(EMPLOYEE_STATUS_MESSAGES, "pin_reset")).toBe("PIN을 초기화했어요.");
    expect(getAdminStatusMessage(EMPLOYEE_STATUS_MESSAGES, "internal database error")).toBeNull();
    expect(getAdminStatusMessage(EMPLOYEE_STATUS_MESSAGES, undefined)).toBeNull();
  });

  it("설정 검증 실패 메시지를 제공한다", () => {
    expect(getAdminStatusMessage(SETTINGS_STATUS_MESSAGES, "invite_code_invalid")).toBe(
      "초대코드는 제어문자 없이 4~64자로 입력해주세요."
    );
  });
});
