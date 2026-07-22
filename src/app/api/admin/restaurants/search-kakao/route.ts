import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/auth/admin-log";
import { mapKakaoCategory, searchPlacesByKeyword } from "@/lib/kakao";
import { createServiceRoleClient } from "@/lib/supabase/server";

async function getCompanyLocation() {
  const { data } = await createServiceRoleClient().from("app_settings").select("company_lat, company_lng").eq("id", 1).maybeSingle();
  if (!data?.company_lat || !data.company_lng) throw new Error("회사 좌표가 설정되지 않았습니다.");
  return { lat: Number(data.company_lat), lng: Number(data.company_lng) };
}

export async function GET(request: Request) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ message: "관리자 로그인이 필요합니다." }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query || query.length > 100) return NextResponse.json({ message: "상호명을 1~100자로 입력해주세요." }, { status: 400 });
  try {
    const location = await getCompanyLocation();
    const places = await searchPlacesByKeyword({ query, ...location, radiusM: 2000 });
    return NextResponse.json({ places: places.map((place) => ({ id: place.id, name: place.place_name, category: place.category_name, address: place.address_name, distanceM: Number(place.distance) })) });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "검색에 실패했습니다." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ message: "관리자 로그인이 필요합니다." }, { status: 401 });
  const body = await request.json() as { query?: unknown; placeId?: unknown };
  if (typeof body.query !== "string" || !body.query.trim() || body.query.length > 100 || typeof body.placeId !== "string") return NextResponse.json({ message: "요청이 올바르지 않습니다." }, { status: 400 });
  try {
    const location = await getCompanyLocation();
    const place = (await searchPlacesByKeyword({ query: body.query.trim(), ...location, radiusM: 2000 })).find((item) => item.id === body.placeId);
    if (!place) return NextResponse.json({ message: "2km 이내 검색 결과에서 다시 확인되지 않았습니다." }, { status: 400 });
    const supabase = createServiceRoleClient();
    const { data: existing } = await supabase.from("restaurants").select("id").eq("kakao_place_id", place.id).maybeSingle();
    if (existing) return NextResponse.json({ id: existing.id, existing: true });
    const { data, error } = await supabase.from("restaurants").insert({ kakao_place_id: place.id, name: place.place_name, category: mapKakaoCategory(place.category_name), address: place.address_name, lat: Number(place.y), lng: Number(place.x), phone: place.phone || null, created_by: admin.id }).select("id").single();
    if (error) throw new Error(`식당 저장 실패: ${error.message}`);
    await logAdminAction(admin.id, "add_kakao_restaurant_by_name", { targetType: "restaurant", targetId: data.id, detail: { kakaoPlaceId: place.id, query: body.query.trim() } });
    return NextResponse.json({ id: data.id, existing: false });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "등록에 실패했습니다." }, { status: 500 }); }
}
