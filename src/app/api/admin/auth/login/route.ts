import { NextResponse } from "next/server";
import { adminLoginSchema } from "@/lib/auth/admin-validation";
import { createSupabaseAuthClient } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/auth/admin-log";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;
  const supabase = await createSupabaseAuthClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return NextResponse.json(
      { ok: false, message: "이메일 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  const serviceClient = createServiceRoleClient();
  const { data: admin, error: adminError } = await serviceClient
    .from("admins")
    .select("id, display_name")
    .eq("id", data.user.id)
    .maybeSingle();

  if (adminError || !admin) {
    await supabase.auth.signOut();
    return NextResponse.json({ ok: false, message: "관리자 권한이 없는 계정입니다." }, { status: 403 });
  }

  await logAdminAction(admin.id, "login");

  return NextResponse.json({ ok: true, email, displayName: admin.display_name });
}
