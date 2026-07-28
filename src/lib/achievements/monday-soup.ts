const SOUP_KEYWORDS = ["국밥", "탕", "찌개"];

/** 메뉴 이름에 국밥/탕/찌개 계열 키워드가 포함되는지 판정한다(숨겨진 업적 "월요일부터 든든하게"). */
export function isMondaySoupMenuName(menuName: string): boolean {
  return SOUP_KEYWORDS.some((keyword) => menuName.includes(keyword));
}

/** Asia/Seoul(UTC+9) 기준으로 YYYY-MM-DD 날짜 문자열이 월요일인지 판정한다. */
export function isSeoulMonday(seoulDateString: string): boolean {
  return new Date(`${seoulDateString}T12:00:00+09:00`).getDay() === 1;
}
