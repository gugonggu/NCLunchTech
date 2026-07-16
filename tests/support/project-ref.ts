/** Supabase 프로젝트 URL(`https://<ref>.supabase.co`)에서 project ref를 추출한다. */
export function extractProjectRefFromUrl(url: string): string | null {
  const match = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return match ? match[1] : null;
}

/** Session pooler 연결 문자열(`postgres.<ref>:...`)에서 project ref를 추출한다. */
export function extractProjectRefFromDbUrl(dbUrl: string): string | null {
  const match = dbUrl.match(/postgres\.([a-z0-9]+):/i);
  return match ? match[1] : null;
}
