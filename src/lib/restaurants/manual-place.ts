export function kakaoPlaceIdFromUrl(value: string): string | null {
  const match = /^https:\/\/place\.map\.kakao\.com\/(\d+)\/?$/.exec(value.trim());
  return match?.[1] ?? null;
}
