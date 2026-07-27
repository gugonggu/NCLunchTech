import "server-only";

import {
  normalizeAppointmentRestaurantSearch,
  searchAppointmentRestaurants,
  type AppointmentRestaurantSearchParams,
  type AppointmentRestaurantSearchState,
  type NormalizedAppointmentRestaurantSearch,
} from "@/lib/appointments/restaurant-search";

export type RouletteRestaurantSearchParams = AppointmentRestaurantSearchParams;
export type NormalizedRouletteRestaurantSearch = NormalizedAppointmentRestaurantSearch;
export type RouletteRestaurantSearchState = AppointmentRestaurantSearchState;

export function normalizeRouletteRestaurantSearch(raw: RouletteRestaurantSearchParams): NormalizedRouletteRestaurantSearch {
  return normalizeAppointmentRestaurantSearch(raw);
}

export async function searchRouletteRestaurants(
  raw: RouletteRestaurantSearchParams,
): Promise<RouletteRestaurantSearchState> {
  return searchAppointmentRestaurants(raw);
}

export async function searchAllRouletteRestaurants(
  raw: RouletteRestaurantSearchParams,
): Promise<Extract<RouletteRestaurantSearchState, { status: "ready" }>['items']> {
  const firstPage = await searchRouletteRestaurants({ ...raw, page: "1" });
  if (firstPage.status !== "ready" || firstPage.totalPages === 1) {
    return firstPage.status === "ready" ? firstPage.items : [];
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      searchRouletteRestaurants({ ...raw, page: String(index + 2) }),
    ),
  );

  return [
    ...firstPage.items,
    ...remainingPages.flatMap((page) => page.status === "ready" ? page.items : []),
  ];
}
