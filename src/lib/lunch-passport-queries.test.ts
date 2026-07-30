import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

import { getLunchPassport } from "./lunch-passport-queries";

function chainable(data: unknown[]) {
  const query: Record<string, unknown> = {};
  for (const method of ["select", "eq", "gte", "lt", "in", "order", "is"]) {
    query[method] = vi.fn(() => query);
  }
  query.then = (resolve: (value: { data: unknown[]; error: null }) => void) =>
    resolve({ data, error: null });
  return query;
}

function restaurantsQueryPaginatedAt1000(targetRestaurant: { id: string; name: string; category: string; is_active: boolean }) {
  const page1 = Array.from({ length: 1000 }, (_, i) => ({
    id: `filler-${i}`,
    name: `필러 ${i}`,
    category: "한식",
    is_active: true,
  }));

  const query: Record<string, unknown> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.range = vi.fn((from: number) =>
    Promise.resolve({ data: from === 0 ? page1 : from === 1000 ? [targetRestaurant] : [], error: null })
  );
  return query;
}

describe("getLunchPassport", () => {
  it("counts a completed visit to a restaurant beyond the first 1000 rows returned by supabase", async () => {
    const targetRestaurant = {
      id: "restaurant-1001",
      name: "천한번째 식당",
      category: "한식",
      is_active: true,
    };

    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "restaurants") return restaurantsQueryPaginatedAt1000(targetRestaurant);
        if (table === "visits") {
          return chainable([{ restaurant_id: targetRestaurant.id, visit_date: "2026-07-30" }]);
        }
        if (table === "appointments") return chainable([]);
        if (table === "appointment_participants") return chainable([]);
        throw new Error(`unexpected table: ${table}`);
      }),
    });

    const passport = await getLunchPassport("employee-1");

    expect(passport.visitedRestaurantCount).toBe(1);
    expect(passport.totalRestaurantCount).toBe(1001);
  });
});
