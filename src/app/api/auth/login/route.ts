import { NextResponse } from "next/server";
import { checkLoginAllowed } from "@/lib/auth/lockout";
import { verifyPin } from "@/lib/auth/pin";
import { SESSION_COOKIE_NAME, createSession, sessionCookieOptions } from "@/lib/auth/session";
import { loginSchema } from "@/lib/auth/validation";
import { createServiceRoleClient } from "@/lib/supabase/server";

const INVALID_CREDENTIALS_MESSAGE = "닉네임 또는 PIN이 올바르지 않습니다.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const { nickname, pin } = parsed.data;
  const supabase = createServiceRoleClient();

  const { data: employee, error } = await supabase
    .from("employees")
    .select("id, pin_hash, failed_login_count, locked_until, is_active")
    .eq("nickname", nickname)
    .maybeSingle();

  if (error || !employee || !employee.is_active) {
    return NextResponse.json({ ok: false, message: INVALID_CREDENTIALS_MESSAGE }, { status: 401 });
  }

  const now = new Date();
  const check = checkLoginAllowed(
    {
      failedLoginCount: employee.failed_login_count,
      lockedUntil: employee.locked_until ? new Date(employee.locked_until) : null,
    },
    now
  );

  if (!check.allowed) {
    const minutes = Math.ceil((check.retryAfterMs ?? 0) / 60000);
    return NextResponse.json(
      { ok: false, message: `로그인 실패 횟수가 초과되어 잠겼습니다. ${minutes}분 후 다시 시도해주세요.` },
      { status: 423 }
    );
  }

  const pinMatches = await verifyPin(pin, employee.pin_hash);
  const { data: attemptResult, error: attemptError } = await supabase.rpc("record_employee_login_attempt", {
    p_employee_id: employee.id,
    p_succeeded: pinMatches,
  });

  if (attemptError) {
    return NextResponse.json({ ok: false, message: "로그인 처리 중 오류가 발생했습니다." }, { status: 500 });
  }

  if (attemptResult === "locked") {
    return NextResponse.json(
      { ok: false, message: "로그인 실패 횟수가 초과되어 잠겼습니다. 10분 후 다시 시도해주세요." },
      { status: 423 }
    );
  }

  if (!pinMatches) {
    return NextResponse.json({ ok: false, message: INVALID_CREDENTIALS_MESSAGE }, { status: 401 });
  }

  const token = await createSession(employee.id);

  const response = NextResponse.json({ ok: true, nickname });
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
  return response;
}
