import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  createTestRestaurant,
  deleteRestaurantById,
  replaceTestRestaurantHours,
} from "../support/db-helpers";
import { INTEGRATION_REGISTRY_PATH } from "../support/registry-paths";

type SearchRow = {
  category: string;
  distance_m: number;
  is_open_now: boolean;
  name: string;
  page_number: number;
  total_count: number;
};

describe("search_appointment_restaurants", () => {
  const prefix = `appointment-search-${Math.random().toString(36).slice(2, 10)}`;
  const restaurantIds: string[] = [];
  let companyLat: number;
  let companyLng: number;

  beforeAll(async () => {
    const supabase = createServiceRoleClient();
    const { data: settings, error } = await supabase
      .from("app_settings")
      .select("company_lat, company_lng")
      .eq("id", 1)
      .single();

    if (error || settings?.company_lat == null || settings.company_lng == null) {
      throw new Error("The isolated test project must have company coordinates configured.");
    }

    companyLat = Number(settings.company_lat);
    companyLng = Number(settings.company_lng);

    const hours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      isClosed: false,
      openTime: "00:00",
      closeTime: "23:59",
    }));

    for (let index = 0; index < 23; index += 1) {
      const id = await createTestRestaurant(INTEGRATION_REGISTRY_PATH, {
        name: `${prefix}-${String(index).padStart(2, "0")}`,
        category: "한식",
        lat: companyLat + index * 0.000005,
        lng: companyLng,
      });
      restaurantIds.push(id);
      const { error: createdAtError } = await supabase
        .from("restaurants")
        .update({ created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString() })
        .eq("id", id);

      if (createdAtError) {
        throw new Error(`Failed to set test restaurant creation time: ${createdAtError.message}`);
      }
      await replaceTestRestaurantHours(id, hours);
    }

    restaurantIds.push(
      await createTestRestaurant(INTEGRATION_REGISTRY_PATH, {
        name: `${prefix}-inactive`,
        category: "한식",
        isActive: false,
        lat: companyLat,
        lng: companyLng,
      }),
    );
    restaurantIds.push(
      await createTestRestaurant(INTEGRATION_REGISTRY_PATH, {
        name: `${prefix}-outside`,
        category: "한식",
        lat: companyLat + 0.03,
        lng: companyLng,
      }),
    );
  });

  afterAll(async () => {
    for (const id of restaurantIds.reverse()) {
      await deleteRestaurantById(INTEGRATION_REGISTRY_PATH, id);
    }
  });

  it("filters active restaurants and returns a clamped paginated result", async () => {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("search_appointment_restaurants", {
      p_query: prefix,
      p_category: "",
      p_radius_m: 2000,
      p_open_now: false,
      p_sort: "name",
      p_page: 1,
      p_page_size: 20,
    });

    expect(error).toBeNull();
    expect(data).toHaveLength(20);
    expect(data?.[0].total_count).toBe(23);
    expect((data as SearchRow[] | null)?.map((row) => row.name)).toEqual(
      ((data as SearchRow[] | null) ?? []).map((row) => row.name).sort(),
    );

    const { data: secondPage, error: secondError } = await supabase.rpc("search_appointment_restaurants", {
      p_query: prefix,
      p_category: "",
      p_radius_m: 2000,
      p_open_now: false,
      p_sort: "name",
      p_page: 2,
      p_page_size: 20,
    });

    expect(secondError).toBeNull();
    expect(secondPage).toHaveLength(3);
    expect(secondPage?.[0].page_number).toBe(2);

    const { data: oversizedPage, error: oversizedError } = await supabase.rpc("search_appointment_restaurants", {
      p_query: prefix,
      p_category: "",
      p_radius_m: 2000,
      p_open_now: false,
      p_sort: "name",
      p_page: 99,
      p_page_size: 20,
    });

    expect(oversizedError).toBeNull();
    expect(oversizedPage).toHaveLength(3);
    expect(oversizedPage?.[0].page_number).toBe(2);
  });

  it("applies category, radius, open, distance, and newest filters", async () => {
    const supabase = createServiceRoleClient();
    const { data: filtered, error } = await supabase.rpc("search_appointment_restaurants", {
      p_query: prefix,
      p_category: "한식",
      p_radius_m: 300,
      p_open_now: true,
      p_sort: "distance",
      p_page: 1,
      p_page_size: 20,
    });

    expect(error).toBeNull();
    expect(filtered).toHaveLength(20);
    expect((filtered as SearchRow[] | null)?.every((row) => row.category === "한식" && row.is_open_now)).toBe(true);
    expect(
      (filtered as SearchRow[] | null)?.every(
        (row, index, rows) => index === 0 || rows[index - 1].distance_m <= row.distance_m,
      ),
    ).toBe(true);

    const { data: newest, error: newestError } = await supabase.rpc("search_appointment_restaurants", {
      p_query: prefix,
      p_category: "",
      p_radius_m: 2000,
      p_open_now: false,
      p_sort: "new",
      p_page: 1,
      p_page_size: 20,
    });

    expect(newestError).toBeNull();
    expect(newest).toHaveLength(20);
    expect(newest?.[0].name).toBe(`${prefix}-22`);
  });
});
