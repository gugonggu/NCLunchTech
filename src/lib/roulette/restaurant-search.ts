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
