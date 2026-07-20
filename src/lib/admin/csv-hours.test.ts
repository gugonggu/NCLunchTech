import { describe, expect, it } from "vitest";
import { parseHoursCsv } from "./csv-hours";

const restaurants = [{ id: "r1", name: "더차이나", kakaoPlaceId: "kakao-1" }];

describe("parseHoursCsv", () => {
  it("헤더가 올바르지 않으면 headerValid=false를 반환한다", () => {
    expect(parseHoursCsv("a,b\n1,2", restaurants, []).headerValid).toBe(false);
  });

  it("영업일 정상 행을 신규로 분류한다", () => {
    const csv = "kakao_place_id,day_of_week,is_closed,open_time,close_time\nkakao-1,0,false,09:00,18:00";
    const result = parseHoursCsv(csv, restaurants, []);
    expect(result.headerValid).toBe(true);
    expect(result.rows[0]).toMatchObject({
      restaurantId: "r1",
      dayOfWeek: 0,
      isClosed: false,
      openTime: "09:00",
      closeTime: "18:00",
      isNew: true,
      errors: [],
    });
  });

  it("휴무일은 시간 없이도 통과한다", () => {
    const csv = "kakao_place_id,day_of_week,is_closed,open_time,close_time\nkakao-1,1,true,,";
    const result = parseHoursCsv(csv, restaurants, []);
    expect(result.rows[0].errors).toEqual([]);
    expect(result.rows[0].isClosed).toBe(true);
  });

  it("이미 등록된 식당·요일이면 수정(isNew=false)으로 분류한다", () => {
    const csv = "kakao_place_id,day_of_week,is_closed,open_time,close_time\nkakao-1,0,false,09:00,18:00";
    const result = parseHoursCsv(csv, restaurants, [{ restaurantId: "r1", dayOfWeek: 0 }]);
    expect(result.rows[0].isNew).toBe(false);
  });

  it("day_of_week가 범위를 벗어나면 오류로 표시한다", () => {
    const csv = "kakao_place_id,day_of_week,is_closed,open_time,close_time\nkakao-1,7,false,09:00,18:00";
    const result = parseHoursCsv(csv, restaurants, []);
    expect(result.rows[0].errors).toContain("day_of_week는 0~6 사이의 정수여야 합니다.");
  });

  it("영업일인데 시간 형식이 잘못되면 오류로 표시한다", () => {
    const csv = "kakao_place_id,day_of_week,is_closed,open_time,close_time\nkakao-1,0,false,9am,18:00";
    const result = parseHoursCsv(csv, restaurants, []);
    expect(result.rows[0].errors).toContain("open_time 형식이 올바르지 않습니다(HH:mm).");
  });

  it("종료 시간이 시작 시간보다 빠르면 오류로 표시한다", () => {
    const csv = "kakao_place_id,day_of_week,is_closed,open_time,close_time\nkakao-1,0,false,18:00,09:00";
    const result = parseHoursCsv(csv, restaurants, []);
    expect(result.rows[0].errors).toContain("close_time은 open_time보다 늦어야 합니다.");
  });

  it("등록되지 않은 kakao_place_id는 오류로 표시한다", () => {
    const csv = "kakao_place_id,day_of_week,is_closed,open_time,close_time\nkakao-999,0,false,09:00,18:00";
    const result = parseHoursCsv(csv, restaurants, []);
    expect(result.rows[0].errors).toContain("등록된 식당의 kakao_place_id가 아닙니다.");
  });

  it("파일 내 같은 식당·요일이 중복되면 오류로 표시한다", () => {
    const csv =
      "kakao_place_id,day_of_week,is_closed,open_time,close_time\nkakao-1,0,false,09:00,18:00\nkakao-1,0,false,10:00,19:00";
    const result = parseHoursCsv(csv, restaurants, []);
    expect(result.rows[1].errors).toContain("파일 내 중복된 식당·요일 조합입니다.");
  });
});
