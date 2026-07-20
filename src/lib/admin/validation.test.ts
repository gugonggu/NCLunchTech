import { describe, expect, it } from "vitest";
import {
  MAX_CSV_BYTES,
  adminUuidSchema,
  announcementSchema,
  companySettingsSchema,
  hoursHistorySnapshotSchema,
  inviteCodeSchema,
  menuHistorySnapshotSchema,
  parseCsvBatchRows,
  validateCsvUpload,
} from "./validation";

describe("adminUuidSchema", () => {
  it("UUID가 아닌 관리자 Action 식별자를 거부한다", () => {
    expect(adminUuidSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});

describe("관리자 설정 검증", () => {
  it("초대코드를 trim하고 4~64자만 허용한다", () => {
    expect(inviteCodeSchema.parse("  lunch-2026  ")).toBe("lunch-2026");
    expect(inviteCodeSchema.safeParse("abc").success).toBe(false);
    expect(inviteCodeSchema.safeParse("a".repeat(65)).success).toBe(false);
  });

  it("초대코드의 제어문자를 거부한다", () => {
    expect(inviteCodeSchema.safeParse("lunch\ncode").success).toBe(false);
  });

  it("빈 공지는 null로 바꾸고 200자를 초과하면 거부한다", () => {
    expect(announcementSchema.parse("   ")).toBeNull();
    expect(announcementSchema.safeParse("가".repeat(201)).success).toBe(false);
  });

  it("기본 반경은 서비스가 지원하는 값만 허용한다", () => {
    expect(
      companySettingsSchema.safeParse({ companyLat: "35.1", companyLng: "129.1", defaultRadiusM: "800" })
        .success
    ).toBe(true);
    expect(
      companySettingsSchema.safeParse({ companyLat: "35.1", companyLng: "129.1", defaultRadiusM: "700" })
        .success
    ).toBe(false);
  });

  it("빈 좌표를 숫자 0으로 강제 변환하지 않는다", () => {
    expect(
      companySettingsSchema.safeParse({ companyLat: "", companyLng: "129.1", defaultRadiusM: "800" }).success
    ).toBe(false);
  });
});

describe("변경 이력 snapshot 검증", () => {
  it("메뉴 가격과 품절 여부가 아닌 값을 거부한다", () => {
    expect(menuHistorySnapshotSchema.safeParse({ price: -1, is_sold_out: "false" }).success).toBe(false);
  });

  it("영업시간은 7개 이하의 유효한 요일·시간만 허용한다", () => {
    expect(
      hoursHistorySnapshotSchema.safeParse([
        { day_of_week: 1, is_closed: false, open_time: "09:00", close_time: "18:00" },
      ]).success
    ).toBe(true);
    expect(
      hoursHistorySnapshotSchema.safeParse([
        { day_of_week: 8, is_closed: false, open_time: "09:00", close_time: "18:00" },
      ]).success
    ).toBe(false);
  });

  it("휴무 snapshot에 영업시간이 남아 있으면 거부한다", () => {
    expect(
      hoursHistorySnapshotSchema.safeParse([
        { day_of_week: 1, is_closed: true, open_time: "09:00", close_time: "18:00" },
      ]).success
    ).toBe(false);
  });
});

describe("저장 CSV batch 검증", () => {
  it("errors가 비어 있어도 필수 메뉴 값이 없으면 거부한다", () => {
    const result = parseCsvBatchRows("menu", [
      {
        rowNumber: 2,
        kakaoPlaceId: "kakao-1",
        name: "",
        price: 1000,
        restaurantId: null,
        restaurantName: null,
        isNew: true,
        errors: [],
      },
    ]);
    expect(result.success).toBe(false);
  });

  it("errors가 비어 있는 영업일은 식당·요일·시작·종료 시간이 모두 필요하다", () => {
    const result = parseCsvBatchRows("hours", [
      {
        rowNumber: 2,
        kakaoPlaceId: "kakao-1",
        dayOfWeek: 1,
        isClosed: false,
        openTime: null,
        closeTime: null,
        restaurantId: null,
        restaurantName: null,
        isNew: true,
        errors: [],
      },
    ]);
    expect(result.success).toBe(false);
  });
});

describe("validateCsvUpload", () => {
  it("CSV 확장자가 아닌 파일을 거부한다", async () => {
    const result = await validateCsvUpload(new File(["a,b"], "menu.txt", { type: "text/plain" }));
    expect(result).toEqual({ ok: false, status: "file_type_invalid" });
  });

  it("2 MiB를 초과한 파일을 거부한다", async () => {
    const result = await validateCsvUpload(new File([new Uint8Array(MAX_CSV_BYTES + 1)], "menu.csv"));
    expect(result).toEqual({ ok: false, status: "file_too_large" });
  });

  it("잘못된 UTF-8 바이트를 거부한다", async () => {
    const result = await validateCsvUpload(
      new File([new Uint8Array([0x61, 0x2c, 0x62, 0x0a, 0xc3, 0x28])], "menu.csv", { type: "text/csv" })
    );
    expect(result).toEqual({ ok: false, status: "encoding_invalid" });
  });

  it("정상 UTF-8 대체 문자 자체는 허용한다", async () => {
    const result = await validateCsvUpload(new File(["a,b\n�,1"], "menu.csv", { type: "text/csv" }));
    expect(result).toEqual({ ok: true, text: "a,b\n�,1" });
  });

  it("데이터 5,000행을 초과한 파일을 거부한다", async () => {
    const text = `a,b\n${Array.from({ length: 5001 }, () => "1,2").join("\n")}`;
    const result = await validateCsvUpload(new File([text], "menu.csv", { type: "text/csv" }));
    expect(result).toEqual({ ok: false, status: "too_many_rows" });
  });

  it("UTF-8 BOM을 제거한 텍스트를 반환한다", async () => {
    const result = await validateCsvUpload(new File(["\uFEFFa,b\n1,2"], "menu.csv", { type: "text/csv" }));
    expect(result).toEqual({ ok: true, text: "a,b\n1,2" });
  });
});
