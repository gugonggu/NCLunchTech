import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/auth/admin-log";
import { syncRestaurantsFromKakao } from "@/lib/restaurants/sync-kakao";

export async function POST() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ ok: false, message: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const result = await syncRestaurantsFromKakao(admin.id);
    await logAdminAction(admin.id, "sync_kakao_restaurants", { detail: { ...result } });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "동기화 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
