import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

import {
  normalizeAppointmentRestaurantSearch,
  searchAppointmentRestaurants,
} from "./restaurant-search";

describe("normalizeAppointmentRestaurantSearch", () => {
  it("trims and caps the query while defaulting invalid filters", () => {
    expect(
      normalizeAppointmentRestaurantSearch({
        q: `  ${"가".repeat(60)}  `,
        category: "invalid",
        radius: "999",
        openNow: "yes",
        sort: "invalid",
        page: "-2",
      }),
    ).toEqual({
      q: "가".repeat(50),
      category: "",
      radius: 800,
      openNow: false,
      sort: "distance",
      page: 1,
    });
  });

  it("accepts the standard GET checkbox value while retaining allowed URL filter values", () => {
    expect(
      normalizeAppointmentRestaurantSearch({
        q: "  김밥  ",
        category: "한식",
        radius: "500",
        openNow: "on",
        sort: "name",
        page: "2",
      }),
    ).toEqual({
      q: "김밥",
      category: "한식",
      radius: 500,
      openNow: true,
      sort: "name",
      page: 2,
    });
  });
});

describe("searchAppointmentRestaurants", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.createServiceRoleClient.mockReset();
    mocks.createServiceRoleClient.mockReturnValue({ rpc: mocks.rpc });
  });

  it("calls the RPC with normalized parameters and converts rows", async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          id: "restaurant-1",
          kakao_place_id: "kakao-1",
          name: "김밥집",
          category: "한식",
          address: "서울시",
          distance_m: "123",
          is_open_now: true,
          total_count: "21",
          page_number: "2",
        },
      ],
      error: null,
    });

    await expect(
      searchAppointmentRestaurants({
        q: "김밥",
        category: "한식",
        radius: "500",
        openNow: "on",
        sort: "name",
        page: "2",
      }),
    ).resolves.toEqual({
      status: "ready",
      items: [
        {
          id: "restaurant-1",
          kakaoPlaceId: "kakao-1",
          name: "김밥집",
          category: "한식",
          address: "서울시",
          distanceM: 123,
          isOpenNow: true,
        },
      ],
      totalCount: 21,
      page: 2,
      totalPages: 2,
      filters: {
        q: "김밥",
        category: "한식",
        radius: 500,
        openNow: true,
        sort: "name",
        page: 2,
      },
    });

    expect(mocks.rpc).toHaveBeenCalledWith("search_appointment_restaurants", {
      p_query: "김밥",
      p_category: "한식",
      p_radius_m: 500,
      p_open_now: true,
      p_sort: "name",
      p_page: 2,
      p_page_size: 20,
    });
  });

  it("returns an empty state for zero rows", async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });

    await expect(searchAppointmentRestaurants({ q: "없는 식당" })).resolves.toEqual({
      status: "empty",
      filters: {
        q: "없는 식당",
        category: "",
        radius: 800,
        openNow: false,
        sort: "distance",
        page: 1,
      },
    });
  });

  it("returns a location-missing state only for the matching RPC error", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "company_location_missing" },
    });

    await expect(searchAppointmentRestaurants({})).resolves.toMatchObject({
      status: "location-missing",
    });
  });

  it("returns an error state for other RPC errors", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "other_error" },
    });

    await expect(searchAppointmentRestaurants({})).resolves.toMatchObject({
      status: "error",
    });
  });
});
