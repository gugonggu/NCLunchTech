export const FRIDAY_PIZZA_PARTY_RESTAURANT_NAME = "파파존스 센텀시티점";
export const FRIDAY_PIZZA_PARTY_PROMO = "friday-pizza-party";
export const FRIDAY_PIZZA_PARTY_DEFAULT_MEMO = "1+1 이벤트 · 대표 주문 후 2~3명이 함께 픽업, 함께 식사해요.";

export function isFridayPizzaPartyPromo(value: unknown): boolean {
  return value === FRIDAY_PIZZA_PARTY_PROMO;
}
