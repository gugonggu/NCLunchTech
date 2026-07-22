export function getSeoulSeasonRange(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", year: "numeric", month: "numeric" }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value); const month = Number(parts.find((part) => part.type === "month")?.value);
  const startMonth = Math.floor((month - 1) / 3) * 3 + 1; const season = ["겨울", "봄", "여름", "가을"][Math.floor((month - 1) / 3)];
  const endYear = startMonth === 10 ? year + 1 : year; const endMonth = startMonth === 10 ? 1 : startMonth + 3;
  return { label: `${year}년 ${season}`, start: new Date(`${year}-${String(startMonth).padStart(2, "0")}-01T00:00:00+09:00`).toISOString(), end: new Date(`${endYear}-${String(endMonth).padStart(2, "0")}-01T00:00:00+09:00`).toISOString() };
}
export function buildSeasonalBadges(visits: Array<{ restaurantId: string }>, reviewCount: number) {
  const badges = [visits.length >= 10 && "시즌 점심러", new Set(visits.map((visit) => visit.restaurantId)).size >= 5 && "시즌 개척자", reviewCount >= 5 && "시즌 기록가"].filter((badge): badge is string => Boolean(badge));
  return badges;
}
