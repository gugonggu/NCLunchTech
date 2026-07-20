import { describe, expect, it } from "vitest";
import { parseMenuCsv } from "./csv-menu";

const restaurants = [
  { id: "r1", name: "더차이나", kakaoPlaceId: "kakao-1" },
  { id: "r2", name: "김밥천국", kakaoPlaceId: "kakao-2" },
];

describe("parseMenuCsv", () => {
  it("헤더가 올바르지 않으면 headerValid=false를 반환한다", () => {
    const result = parseMenuCsv("a,b,c\n1,2,3", restaurants, []);
    expect(result.headerValid).toBe(false);
  });

  it("정상 행을 신규로 분류한다(기존 메뉴 없음)", () => {
    const csv = "kakao_place_id,name,price\nkakao-1,짜장면,8000";
    const result = parseMenuCsv(csv, restaurants, []);
    expect(result.headerValid).toBe(true);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      restaurantId: "r1",
      name: "짜장면",
      price: 8000,
      isNew: true,
      errors: [],
    });
  });

  it("이미 존재하는 식당·메뉴명 조합은 수정(isNew=false)으로 분류한다", () => {
    const csv = "kakao_place_id,name,price\nkakao-1,짜장면,9000";
    const result = parseMenuCsv(csv, restaurants, [{ restaurantId: "r1", name: "짜장면" }]);
    expect(result.rows[0].isNew).toBe(false);
  });

  it("등록되지 않은 kakao_place_id는 오류로 표시한다", () => {
    const csv = "kakao_place_id,name,price\nkakao-999,짜장면,8000";
    const result = parseMenuCsv(csv, restaurants, []);
    expect(result.rows[0].errors).toContain("등록된 식당의 kakao_place_id가 아닙니다.");
    expect(result.rows[0].restaurantId).toBeNull();
  });

  it("name이 비어 있으면 오류로 표시한다", () => {
    const csv = "kakao_place_id,name,price\nkakao-1,,8000";
    const result = parseMenuCsv(csv, restaurants, []);
    expect(result.rows[0].errors).toContain("name이 비어 있습니다.");
  });

  it("price가 숫자가 아니면 오류로 표시한다", () => {
    const csv = "kakao_place_id,name,price\nkakao-1,짜장면,비쌈";
    const result = parseMenuCsv(csv, restaurants, []);
    expect(result.rows[0].errors).toContain("price는 0 이상의 정수여야 합니다.");
  });

  it("price가 비어 있으면 오류 없이 null로 처리한다(가격 정보 없음)", () => {
    const csv = "kakao_place_id,name,price\nkakao-1,짜장면,";
    const result = parseMenuCsv(csv, restaurants, []);
    expect(result.rows[0].price).toBeNull();
    expect(result.rows[0].errors).toEqual([]);
  });

  it("파일 내에서 같은 식당·메뉴명이 중복되면 오류로 표시한다", () => {
    const csv = "kakao_place_id,name,price\nkakao-1,짜장면,8000\nkakao-1,짜장면,9000";
    const result = parseMenuCsv(csv, restaurants, []);
    expect(result.rows[0].errors).toEqual([]);
    expect(result.rows[1].errors).toContain("파일 내 중복된 식당·메뉴명입니다.");
  });
});
