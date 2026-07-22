import "server-only";
import { mapKakaoCategory, searchNearbyPlaces, type KakaoPlace } from "@/lib/kakao";
import { createServiceRoleClient } from "@/lib/supabase/server";

export interface SyncResult {
  gridPoints: number;
  found: number;
  inserted: number;
  skipped: number;
}

export interface GridPoint {
  lat: number;
  lng: number;
}

const METERS_PER_LAT_DEGREE = 111320;
const GRID_CELL_RADIUS_M = 400;
export const KAKAO_SYNC_SEARCH_RADIUS_M = 2000;
export const KAKAO_SYNC_GRID_SPACING_M = 400;

/**
 * 중심 좌표 주변을 격자로 나눠 하위 검색 지점을 만든다.
 * Kakao 카테고리 검색은 지점당 최대 45건만 반환하므로, 넓은 반경을 그대로 한 번에 검색하면
 * 실제로는 더 많이 존재하는 식당을 놓친다. 여러 지점으로 나눠 검색한 뒤 합치면 더 많이 수집할 수 있다.
 */
export function buildSearchGrid(center: GridPoint, radiusM: number, spacingM = 1000): GridPoint[] {
  const steps = Math.ceil(radiusM / spacingM);
  const offsets: number[] = [];
  for (let i = -steps; i <= steps; i++) {
    offsets.push(i * spacingM);
  }

  const lngMetersPerDegree = METERS_PER_LAT_DEGREE * Math.cos((center.lat * Math.PI) / 180);
  const maxDistance = radiusM + spacingM;

  const points: GridPoint[] = [];
  for (const dy of offsets) {
    for (const dx of offsets) {
      if (Math.sqrt(dx * dx + dy * dy) > maxDistance) continue;
      points.push({
        lat: center.lat + dy / METERS_PER_LAT_DEGREE,
        lng: center.lng + dx / lngMetersPerDegree,
      });
    }
  }

  return points;
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

  const grid = buildSearchGrid(
    { lat: settings.company_lat, lng: settings.company_lng },
    KAKAO_SYNC_SEARCH_RADIUS_M,
    KAKAO_SYNC_GRID_SPACING_M,
  );

  const foundByPlaceId = new Map<string, KakaoPlace>();

  for (const point of grid) {
    const places = await searchNearbyPlaces({
      lat: point.lat,
      lng: point.lng,
      radiusM: GRID_CELL_RADIUS_M,
    });

    for (const place of places) {
      foundByPlaceId.set(place.id, place);
    }
  }

  let inserted = 0;
  let skipped = 0;

  for (const place of foundByPlaceId.values()) {
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

  return { gridPoints: grid.length, found: foundByPlaceId.size, inserted, skipped };
}
