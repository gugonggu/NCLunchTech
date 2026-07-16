import "server-only";
import { mapKakaoCategory, searchNearbyPlaces } from "@/lib/kakao";
import { createServiceRoleClient } from "@/lib/supabase/server";

export interface SyncResult {
  found: number;
  inserted: number;
  skipped: number;
}

export async function syncRestaurantsFromKakao(adminId: string): Promise<SyncResult> {
  const supabase = createServiceRoleClient();

  const { data: settings, error: settingsError } = await supabase
    .from("app_settings")
    .select("company_lat, company_lng, default_radius_m")
    .eq("id", 1)
    .maybeSingle();

  if (settingsError || !settings?.company_lat || !settings?.company_lng) {
    throw new Error("회사 좌표가 설정되지 않았습니다. app_settings를 먼저 확인해주세요.");
  }

  const places = await searchNearbyPlaces({
    lat: settings.company_lat,
    lng: settings.company_lng,
    radiusM: 2000, // 최대 노출 반경까지 폭넓게 수집. 실제 노출 반경 필터링은 추천/검색 단계에서 처리한다.
  });

  let inserted = 0;
  let skipped = 0;

  for (const place of places) {
    const { data, error } = await supabase
      .from("restaurants")
      .insert({
        kakao_place_id: place.id,
        name: place.place_name,
        category: mapKakaoCategory(place.category_name),
        address: place.address_name,
        lat: Number(place.y),
        lng: Number(place.x),
        phone: place.phone || null,
        created_by: adminId,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        skipped += 1;
        continue;
      }
      throw new Error(`식당 저장 실패: ${error.message}`);
    }

    if (data) {
      inserted += 1;
    }
  }

  return { found: places.length, inserted, skipped };
}
