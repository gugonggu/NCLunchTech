import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/auth/admin-log";
import { kakaoPlaceIdFromUrl } from "@/lib/restaurants/manual-place";
import { createServiceRoleClient } from "@/lib/supabase/server";

const categories = ["한식", "중식", "일식", "양식", "분식", "아시아 음식", "패스트푸드", "카페·간단식", "기타"];
export async function POST(request: Request) {
  const admin = await getCurrentAdmin(); if (!admin) return NextResponse.json({ message: "관리자 로그인이 필요합니다." }, { status: 401 });
  const b = await request.json() as Record<string, unknown>;
  const id = typeof b.kakaoUrl === "string" ? kakaoPlaceIdFromUrl(b.kakaoUrl) : null;
  const lat = Number(b.lat), lng = Number(b.lng);
  if (!id || typeof b.name !== "string" || !b.name.trim() || !categories.includes(String(b.category)) || !Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ message: "입력값을 다시 확인해주세요." }, { status: 400 });
  const s = createServiceRoleClient(); const { data: existing } = await s.from("restaurants").select("id").eq("kakao_place_id", id).maybeSingle();
  if (existing) return NextResponse.json({ id: existing.id, existing: true });
  const { data, error } = await s.from("restaurants").insert({ kakao_place_id: id, name: b.name.trim(), category: b.category, address: typeof b.address === "string" ? b.address.trim() || null : null, lat, lng, phone: null, created_by: admin.id }).select("id").single();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  await logAdminAction(admin.id, "add_kakao_restaurant_manually", { targetType: "restaurant", targetId: data.id, detail: { kakaoPlaceId: id } });
  return NextResponse.json({ id: data.id, existing: false });
}
