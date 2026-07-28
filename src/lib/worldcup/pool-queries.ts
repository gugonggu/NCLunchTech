import "server-only";
import { distanceInMeters } from "@/lib/geo";
import { DEFAULT_RADIUS_M } from "@/lib/restaurants/constants";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { getRepresentativeRestaurantPhotoMap } from "@/lib/review-photos/queries";
import { dedupeMenuPool, normalizeMenuName, type MenuPoolEntry, type WorldcupCandidate } from "./candidates";

/** 이 식당이 파는 메뉴 중 하나가, 이 직원이 완료한 어떤 월드컵의 우승 메뉴와 이름이 일치하는지 확인한다. */
export async function restaurantSellsAnyOfEmployeesWorldcupWinners(
  employeeId: string,
  restaurantId: string
): Promise<boolean> {
  const supabase = createServiceRoleClient();

  const [{ data: winners }, { data: restaurant }] = await Promise.all([
    supabase
      .from("menu_worldcup_sessions")
      .select("winner_menu_key")
      .eq("employee_id", employeeId)
      .eq("status", "COMPLETED")
      .not("winner_menu_key", "is", null),
    supabase.from("restaurants").select("menu_items(name, is_sold_out)").eq("id", restaurantId).maybeSingle(),
  ]);

  const winnerKeys = new Set((winners ?? []).map((w) => w.winner_menu_key as string));
  if (winnerKeys.size === 0 || !restaurant) return false;

  return (restaurant.menu_items ?? []).some(
    (m: { name: string; is_sold_out: boolean }) => !m.is_sold_out && winnerKeys.has(normalizeMenuName(m.name))
  );
}

async function getCompanyLocation(supabase: ReturnType<typeof createServiceRoleClient>) {
  const { data: settings } = await supabase
    .from("app_settings")
    .select("company_lat, company_lng, default_radius_m")
    .eq("id", 1)
    .maybeSingle();

  return {
    lat: (settings?.company_lat ?? null) as number | null,
    lng: (settings?.company_lng ?? null) as number | null,
    radius: settings?.default_radius_m ?? DEFAULT_RADIUS_M,
  };
}

/**
 * 활성·비제외·반경 내 식당의 판매 중(재료 소진 아님) 메뉴를 모아 후보 풀을 만든다.
 * 영업 중 여부 필터는 이번 단계에서는 적용하지 않는다(추천 엔진의 영업시간 로직 재사용은 다음 단계 과제).
 */
export async function fetchWorldcupMenuPool(): Promise<WorldcupCandidate[]> {
  const supabase = createServiceRoleClient();
  const { lat: companyLat, lng: companyLng, radius } = await getCompanyLocation(supabase);

  const restaurants = await fetchAllRows((from, to) =>
    supabase
      .from("restaurants")
      .select("id, category, lat, lng, menu_items(name, is_sold_out)")
      .eq("is_active", true)
      .eq("excluded_from_recommend", false)
      .range(from, to)
  );

  const entries: MenuPoolEntry[] = [];
  for (const restaurant of restaurants) {
    if (companyLat === null || companyLng === null) {
      continue;
    }
    const distanceM = distanceInMeters({ lat: companyLat, lng: companyLng }, { lat: restaurant.lat, lng: restaurant.lng });
    if (distanceM > radius) {
      continue;
    }

    for (const menuItem of restaurant.menu_items ?? []) {
      const item = menuItem as { name: string; is_sold_out: boolean };
      if (item.is_sold_out || item.name.trim().length === 0) {
        continue;
      }
      entries.push({
        menuKey: normalizeMenuName(item.name),
        name: item.name.trim(),
        categoryId: restaurant.category,
        restaurantId: restaurant.id,
      });
    }
  }

  return dedupeMenuPool(entries);
}

/**
 * 활성·비제외·반경 내 식당 자체를 후보로 만든다(식당 월드컵용).
 * 대표 메뉴는 등록된 메뉴 중 판매 중인 첫 번째 메뉴를 쓰고, 대표 사진은 최근 리뷰 사진을 재사용한다.
 */
export async function fetchWorldcupRestaurantPool(): Promise<WorldcupCandidate[]> {
  const supabase = createServiceRoleClient();
  const { lat: companyLat, lng: companyLng, radius } = await getCompanyLocation(supabase);

  const restaurants = await fetchAllRows((from, to) =>
    supabase
      .from("restaurants")
      .select("id, name, category, lat, lng, menu_items(name, price, is_sold_out)")
      .eq("is_active", true)
      .eq("excluded_from_recommend", false)
      .range(from, to)
  );

  const inRadius = restaurants.flatMap((restaurant) => {
    if (companyLat === null || companyLng === null) {
      return [];
    }
    const distanceM = distanceInMeters({ lat: companyLat, lng: companyLng }, { lat: restaurant.lat, lng: restaurant.lng });
    if (distanceM > radius) {
      return [];
    }
    return [{ restaurant, distanceM: Math.round(distanceM) }];
  });

  const photoByRestaurantId = await getRepresentativeRestaurantPhotoMap(inRadius.map((r) => r.restaurant.id));

  return inRadius.map(({ restaurant, distanceM }) => {
    const representativeMenu = (restaurant.menu_items ?? []).find(
      (m: { name: string; is_sold_out: boolean }) => !m.is_sold_out && m.name.trim().length > 0
    ) as { name: string; price: number | null } | undefined;

    return {
      menuKey: restaurant.id,
      name: restaurant.name,
      categoryId: restaurant.category,
      restaurantIds: [restaurant.id],
      photoUrl: photoByRestaurantId.get(restaurant.id) ?? null,
      distanceM,
      representativeMenuName: representativeMenu?.name ?? null,
      representativeMenuPrice: representativeMenu?.price ?? null,
    };
  });
}

export interface WorldcupResultRestaurant {
  id: string;
  name: string;
  category: string;
  distanceM: number;
  menuName: string | null;
  menuPrice: number | null;
}

/** 우승 메뉴를 파는 식당 중 회사에서 가까운 순으로 최대 3곳을 조회한다. */
export async function getWorldcupResultRestaurants(
  restaurantIds: string[],
  winnerMenuKey: string
): Promise<WorldcupResultRestaurant[]> {
  if (restaurantIds.length === 0) {
    return [];
  }

  const supabase = createServiceRoleClient();
  const [{ data: settings }, { data: restaurants }] = await Promise.all([
    supabase.from("app_settings").select("company_lat, company_lng").eq("id", 1).maybeSingle(),
    supabase
      .from("restaurants")
      .select("id, name, category, lat, lng, menu_items(name, price, is_sold_out)")
      .in("id", restaurantIds)
      .eq("is_active", true),
  ]);

  const companyLat: number | null = settings?.company_lat ?? null;
  const companyLng: number | null = settings?.company_lng ?? null;

  return (restaurants ?? [])
    .map((restaurant) => {
      const matchedMenu = (restaurant.menu_items ?? []).find(
        (m: { name: string; is_sold_out: boolean }) => normalizeMenuName(m.name) === winnerMenuKey && !m.is_sold_out
      ) as { name: string; price: number | null } | undefined;

      return {
        id: restaurant.id,
        name: restaurant.name,
        category: restaurant.category,
        distanceM:
          companyLat !== null && companyLng !== null
            ? Math.round(distanceInMeters({ lat: companyLat, lng: companyLng }, { lat: restaurant.lat, lng: restaurant.lng }))
            : Number.POSITIVE_INFINITY,
        menuName: matchedMenu?.name ?? null,
        menuPrice: matchedMenu?.price ?? null,
      };
    })
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 3);
}
