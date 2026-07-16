import { describe, expect, it } from "vitest";
import { restaurantHoursSchema } from "./hours-validation";

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
