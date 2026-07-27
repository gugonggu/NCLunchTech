export type TitlesRelation = { name: string }[] | { name: string } | null;

/** Supabase가 1:N/1:1 관계를 배열 또는 단일 객체로 반환하는 것을 흡수한다. */
export function extractTitleName(titles: TitlesRelation): string | null {
  if (!titles) return null;
  return Array.isArray(titles) ? titles[0]?.name ?? null : titles.name;
}
