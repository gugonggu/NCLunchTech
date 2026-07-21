import { describe, expect, it } from "vitest";
import { formatTimeToMinute, isOpenNow, restaurantHoursSchema, type OpenNowRow } from "./hours-validation";

function buildWeek(overrides: Partial<Record<number, Record<string, unknown>>> = {}) {
  return Array.from({ length: 7 }, (_, day) => ({
    dayOfWeek: day,
    isClosed: false,
    openTime: "09:00",
    closeTime: "18:00",
    ...(overrides[day] ?? {}),
  }));
}

describe("restaurantHoursSchema", () => {
  it("정상적인 7일 영업시간은 통과한다", () => {
    const result = restaurantHoursSchema.safeParse(buildWeek());
    expect(result.success).toBe(true);
  });

  it("휴무일은 시간이 없어도 통과한다", () => {
    const week = buildWeek({ 0: { isClosed: true, openTime: null, closeTime: null } });
    const result = restaurantHoursSchema.safeParse(week);
    expect(result.success).toBe(true);
  });

  it("영업일인데 시작 시간이 없으면 실패한다", () => {
    const week = buildWeek({ 0: { openTime: null } });
    const result = restaurantHoursSchema.safeParse(week);
    expect(result.success).toBe(false);
  });

  it("영업일인데 종료 시간이 없으면 실패한다", () => {
    const week = buildWeek({ 0: { closeTime: null } });
    const result = restaurantHoursSchema.safeParse(week);
    expect(result.success).toBe(false);
  });

  it("HH:mm 형식이 아니면 실패한다", () => {
    const week = buildWeek({ 0: { openTime: "9:00" } });
    expect(restaurantHoursSchema.safeParse(week).success).toBe(false);

    const week2 = buildWeek({ 0: { closeTime: "25:00" } });
    expect(restaurantHoursSchema.safeParse(week2).success).toBe(false);
  });

  it("종료 시간이 시작 시간보다 이르거나 같으면 실패한다(익일 영업 미지원)", () => {
    const earlier = buildWeek({ 0: { openTime: "18:00", closeTime: "09:00" } });
    expect(restaurantHoursSchema.safeParse(earlier).success).toBe(false);

    const same = buildWeek({ 0: { openTime: "09:00", closeTime: "09:00" } });
    expect(restaurantHoursSchema.safeParse(same).success).toBe(false);
  });

  it("요일이 7개가 아니면 실패한다", () => {
    const week = buildWeek().slice(0, 6);
    expect(restaurantHoursSchema.safeParse(week).success).toBe(false);
  });
});

describe("isOpenNow", () => {
  // Asia/Seoul 기준 정오(12:00)가 되는 UTC 시각. 실제 요일은 계산해서 쓴다(하드코딩 의존 없음).
  const now = new Date("2026-07-15T03:00:00.000Z");
  const seoulDayOfWeek = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCDay();

  function hoursMap(row: Partial<OpenNowRow> = {}): Map<number, OpenNowRow> {
    return new Map([
      [
        seoulDayOfWeek,
        { dayOfWeek: seoulDayOfWeek, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00", ...row },
      ],
    ]);
  }

  it("영업시간 범위 안이면 true", () => {
    expect(isOpenNow(hoursMap(), now)).toBe(true);
  });

  it("휴무일이면 false", () => {
    expect(isOpenNow(hoursMap({ isClosed: true, openTime: null, closeTime: null }), now)).toBe(false);
  });

  it("해당 요일 데이터가 없으면 false", () => {
    expect(isOpenNow(new Map(), now)).toBe(false);
  });

  it("영업 시작 전이면 false", () => {
    expect(isOpenNow(hoursMap({ openTime: "13:00:00" }), now)).toBe(false);
  });

  it("영업 종료 후면 false", () => {
    expect(isOpenNow(hoursMap({ closeTime: "11:00:00" }), now)).toBe(false);
  });

  it("종료 시각 정각은 영업 중이 아니다", () => {
    expect(isOpenNow(hoursMap({ openTime: "09:00:00", closeTime: "12:00:00" }), now)).toBe(false);
  });
});

describe("formatTimeToMinute", () => {
  it("HH:mm:ss는 HH:mm으로 자른다", () => {
    expect(formatTimeToMinute("09:00:00")).toBe("09:00");
    expect(formatTimeToMinute("23:59:59")).toBe("23:59");
  });

  it("이미 HH:mm이면 그대로 둔다", () => {
    expect(formatTimeToMinute("09:00")).toBe("09:00");
  });

  it("null/undefined/빈 문자열은 빈 문자열로 안전하게 처리한다", () => {
    expect(formatTimeToMinute(null)).toBe("");
    expect(formatTimeToMinute(undefined)).toBe("");
    expect(formatTimeToMinute("")).toBe("");
  });

  it("형식이 이상한 값도 예외 없이 빈 문자열을 반환한다", () => {
    expect(formatTimeToMinute("아무거나")).toBe("");
    expect(formatTimeToMinute("9")).toBe("");
  });
});
