import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

/**
 * 서비스 롤 키를 사용하는 서버 전용 Supabase 클라이언트.
 * Server Action/Route Handler 안에서만 호출한다. 클라이언트 번들에 포함되면
 * "server-only" 가드가 빌드 타임에 에러를 발생시킨다.
 */
export function createServiceRoleClient() {
  const env = getServerEnv();

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
