import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Supabase Auth 세션 쿠키를 다루는 클라이언트.
 * Server Component 렌더링 중에는 쿠키를 쓸 수 없으므로 setAll 실패를 무시한다.
 * (세션 토큰 갱신은 middleware가 담당한다.)
 */
export async function createSupabaseAuthClient() {
  const env = getServerEnv();
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component에서 호출된 경우 무시한다.
        }
      },
    },
  });
}

export interface CurrentAdmin {
  id: string;
  email: string;
  displayName: string | null;
}

/** 로그인 여부와 admins 테이블 소속 여부를 모두 확인한다. */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const supabase = await createSupabaseAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const serviceClient = createServiceRoleClient();
  const { data: admin, error } = await serviceClient
    .from("admins")
    .select("id, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !admin) {
    return null;
  }

  return { id: admin.id, email: user.email ?? "", displayName: admin.display_name };
}
