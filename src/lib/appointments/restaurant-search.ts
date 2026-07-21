import "server-only";

import { DEFAULT_RADIUS_M, RADIUS_OPTIONS_M, RESTAURANT_CATEGORIES } from "@/lib/restaurants/constants";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const APPOINTMENT_RESTAURANT_PAGE_SIZE = 20;

type AppointmentRestaurantSort = "distance" | "name" | "new";

export type AppointmentRestaurantSearchParams = {
  q?: string;
  category?: string;
  radius?: string;
  openNow?: string;
  sort?: string;
  page?: string;
};

export type NormalizedAppointmentRestaurantSearch = {
  q: string;
  category: string;
  radius: number;
  openNow: boolean;
  sort: AppointmentRestaurantSort;
  page: number;
};

export type AppointmentRestaurantSearchItem = {
  id: string;
  kakaoPlaceId: string | null;
  name: string;
  category: string;
  address: string;
  distanceM: number;
  isOpenNow: boolean;
};

export type AppointmentRestaurantSearchState =
  | {
      status: "ready";
      items: AppointmentRestaurantSearchItem[];
      totalCount: number;
      page: number;
      totalPages: number;
      filters: NormalizedAppointmentRestaurantSearch;
    }
  | { status: "empty"; filters: NormalizedAppointmentRestaurantSearch }
  | { status: "location-missing"; filters: NormalizedAppointmentRestaurantSearch }
  | { status: "error"; filters: NormalizedAppointmentRestaurantSearch };

type AppointmentRestaurantSearchRow = {
  id: string;
  kakao_place_id: string | null;
  name: string;
  category: string;
  address: string;
  distance_m: number | string;
  is_open_now: boolean;
  total_count: number | string;
  page_number: number | string;
};

const SORTS: readonly AppointmentRestaurantSort[] = ["distance", "name", "new"];

export function normalizeAppointmentRestaurantSearch(
  raw: AppointmentRestaurantSearchParams,
): NormalizedAppointmentRestaurantSearch {
  const category = raw.category?.trim() ?? "";
  const radius = Number(raw.radius);
  const page = Number(raw.page);
  const sort = raw.sort ?? "";

  return {
    q: (raw.q ?? "").trim().slice(0, 50),
    category: (RESTAURANT_CATEGORIES as readonly string[]).includes(category) ? category : "",
    radius: (RADIUS_OPTIONS_M as readonly number[]).includes(radius) ? radius : DEFAULT_RADIUS_M,
    openNow: raw.openNow === "on" || raw.openNow === "true",
    sort: (SORTS as readonly string[]).includes(sort) ? (sort as AppointmentRestaurantSort) : "distance",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export async function searchAppointmentRestaurants(
  raw: AppointmentRestaurantSearchParams,
): Promise<AppointmentRestaurantSearchState> {
  const filters = normalizeAppointmentRestaurantSearch(raw);
  const { data, error } = await createServiceRoleClient().rpc("search_appointment_restaurants", {
    p_query: filters.q,
    p_category: filters.category,
    p_radius_m: filters.radius,
    p_open_now: filters.openNow,
    p_sort: filters.sort,
    p_page: filters.page,
    p_page_size: APPOINTMENT_RESTAURANT_PAGE_SIZE,
  });

  if (error) {
    return {
      status: error.code === "P0001" && error.message === "company_location_missing" ? "location-missing" : "error",
      filters,
    };
  }

  const rows = (data ?? []) as AppointmentRestaurantSearchRow[];
  if (rows.length === 0) {
    return { status: "empty", filters };
  }

  const totalCount = Number(rows[0].total_count);

  return {
    status: "ready",
    items: rows.map((row) => ({
      id: row.id,
      kakaoPlaceId: row.kakao_place_id,
      name: row.name,
      category: row.category,
      address: row.address,
      distanceM: Number(row.distance_m),
      isOpenNow: row.is_open_now,
    })),
    totalCount,
    page: Number(rows[0].page_number),
    totalPages: Math.max(1, Math.ceil(totalCount / APPOINTMENT_RESTAURANT_PAGE_SIZE)),
    filters,
  };
}
