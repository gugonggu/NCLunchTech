export const RESTAURANT_CATEGORIES = [
  "한식",
  "중식",
  "일식",
  "양식",
  "분식",
  "아시아 음식",
  "패스트푸드",
  "카페·간단식",
  "기타",
] as const;

export type RestaurantCategory = (typeof RESTAURANT_CATEGORIES)[number];

export const RADIUS_OPTIONS_M = [300, 500, 800, 1200, 2000] as const;
export const DEFAULT_RADIUS_M = 800;
