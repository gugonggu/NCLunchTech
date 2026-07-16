import { createClient } from "@supabase/supabase-js";

/**
 * 브라우저에서 사용하는 익명 키 기반 Supabase 클라이언트.
 * 관리자 Supabase Auth 세션(2단계 이후)에서 사용할 예정이며,
 * 서비스 롤 키는 이 파일에서 절대 참조하지 않는다.
 */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase 공개 환경변수(NEXT_PUBLIC_*)가 설정되지 않았습니다.");
  }

  return createClient(url, anonKey);
}
