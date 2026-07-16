import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateSessionToken, hashSessionToken } from "@/lib/auth/session-token";

export const SESSION_COOKIE_NAME = "nc_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30일

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DURATION_MS / 1000,
};

export interface SessionEmployee {
  id: string;
  nickname: string;
}

export async function createSession(employeeId: string): Promise<string> {
  const supabase = createServiceRoleClient();
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const { error } = await supabase.from("employee_sessions").insert({
    employee_id: employeeId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(`세션 생성 실패: ${error.message}`);
  }

  return token;
}

/** 세션을 조회하고, 유효하면 마지막 사용 시각과 만료 시각을 30일 뒤로 밀어 연장한다. */
export async function findEmployeeBySessionToken(token: string): Promise<SessionEmployee | null> {
  const supabase = createServiceRoleClient();
  const tokenHash = hashSessionToken(token);
  const now = new Date();

  const { data: session, error } = await supabase
    .from("employee_sessions")
    .select("id, employee_id, expires_at")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !session || new Date(session.expires_at) <= now) {
    return null;
  }

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id, nickname, is_active")
    .eq("id", session.employee_id)
    .maybeSingle();

  if (employeeError || !employee || !employee.is_active) {
    return null;
  }

  const newExpiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
  await supabase
    .from("employee_sessions")
    .update({ last_used_at: now.toISOString(), expires_at: newExpiresAt.toISOString() })
    .eq("id", session.id);

  return { id: employee.id, nickname: employee.nickname };
}

export async function revokeSession(token: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const tokenHash = hashSessionToken(token);

  await supabase
    .from("employee_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", tokenHash);
}
