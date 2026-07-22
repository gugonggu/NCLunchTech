import { NextResponse } from "next/server";
import { hashPin } from "@/lib/auth/pin";
import { SESSION_COOKIE_NAME, createSession, sessionCookieOptions } from "@/lib/auth/session";
import { signupSchema } from "@/lib/auth/validation";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const { inviteCode, nickname, realName, pin } = parsed.data;
  const supabase = createServiceRoleClient();

  const { data: settings, error: settingsError } = await supabase
    .from("app_settings")
    .select("invite_code")
    .eq("id", 1)
    .maybeSingle();

  if (settingsError || !settings) {
    return NextResponse.json(
      { ok: false, message: "초대코드 설정을 확인할 수 없습니다. 관리자에게 문의하세요." },
      { status: 500 }
    );
  }

  if (settings.invite_code !== inviteCode) {
    return NextResponse.json({ ok: false, message: "초대코드가 올바르지 않습니다." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("employees")
    .select("id")
    .eq("nickname", nickname)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: false, message: "이미 사용 중인 닉네임입니다." }, { status: 409 });
  }

  const pinHash = await hashPin(pin);

  const { data: employee, error: insertError } = await supabase
    .from("employees")
    .insert({ nickname, real_name: realName, pin_hash: pinHash })
    .select("id, nickname, real_name")
    .single();

  if (insertError || !employee) {
    if (insertError?.code === "23505") {
      return NextResponse.json({ ok: false, message: "이미 사용 중인 닉네임입니다." }, { status: 409 });
    }
    return NextResponse.json({ ok: false, message: "가입 처리 중 오류가 발생했습니다." }, { status: 500 });
  }

  const token = await createSession(employee.id);

  const response = NextResponse.json({ ok: true, nickname: employee.nickname, realName: employee.real_name });
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
  return response;
}
