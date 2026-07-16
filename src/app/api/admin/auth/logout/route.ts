import { NextResponse } from "next/server";
import { createSupabaseAuthClient, getCurrentAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/auth/admin-log";

export async function POST() {
  const admin = await getCurrentAdmin();
  const supabase = await createSupabaseAuthClient();

  if (admin) {
    await logAdminAction(admin.id, "logout");
  }

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
