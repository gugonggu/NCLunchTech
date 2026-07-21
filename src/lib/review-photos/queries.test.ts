import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

import { getRepresentativeRestaurantPhotoMap } from "./queries";

interface PhotoRow {
  storage_path: string;
  reviews: { restaurant_id: string };
}

type QueryOutcome =
  | { data: PhotoRow[] | null; error: Error | null }
  | { throws: Error };

function setupClient(outcomes: Record<string, QueryOutcome>) {
  const globalRows = Object.values(outcomes).flatMap((outcome) =>
    "data" in outcome ? (outcome.data ?? []) : [],
  );
  const globalOrder = vi.fn().mockResolvedValue({
    data: globalRows,
    error: null,
  });
  const inFilter = vi.fn(() => ({ order: globalOrder }));
  const queries = new Map<
    string,
    { eq: ReturnType<typeof vi.fn>; order: ReturnType<typeof vi.fn>; limit: ReturnType<typeof vi.fn> }
  >();
  const from = vi.fn(() => {
    let restaurantId = "";
    const limit = vi.fn(async () => {
      const outcome = outcomes[restaurantId] ?? { data: [], error: null };
      if ("throws" in outcome) {
        throw outcome.throws;
      }
      return outcome;
    });
    const order = vi.fn(() => ({ limit }));
    const eq = vi.fn((_column: string, id: string) => {
      restaurantId = id;
      queries.set(id, { eq, order, limit });
      return { order };
    });
    const select = vi.fn(() => ({ eq, in: inFilter }));
    return { select };
  });
  const storageFrom = vi.fn(() => ({
    getPublicUrl: (path: string) => ({
      data: { publicUrl: `https://photos.test/${path}` },
    }),
  }));
  const client = {
    from,
    storage: { from: storageFrom },
  };
  mocks.createServiceRoleClient.mockReturnValue(client);

  return { client, inFilter, queries };
}

describe("getRepresentativeRestaurantPhotoMap", () => {
  beforeEach(() => {
    mocks.createServiceRoleClient.mockReset();
  });

  it("does not create a Supabase client when restaurant ids are empty", async () => {
    await expect(getRepresentativeRestaurantPhotoMap([])).resolves.toEqual(
      new Map(),
    );
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("queries the newest photo once per unique restaurant id", async () => {
    const { client, inFilter, queries } = setupClient({
      r1: {
        data: [
          {
            storage_path: "new-r1.jpg",
            reviews: { restaurant_id: "r1" },
          },
        ],
        error: null,
      },
      r2: {
        data: [
          {
            storage_path: "older-r2.jpg",
            reviews: { restaurant_id: "r2" },
          },
        ],
        error: null,
      },
    });

    await expect(
      getRepresentativeRestaurantPhotoMap(["r1", "r1", "r2"]),
    ).resolves.toEqual(
      new Map([
        ["r1", "https://photos.test/new-r1.jpg"],
        ["r2", "https://photos.test/older-r2.jpg"],
      ]),
    );

    expect(mocks.createServiceRoleClient).toHaveBeenCalledTimes(1);
    expect(client.from).toHaveBeenCalledTimes(2);
    expect(inFilter).not.toHaveBeenCalled();
    for (const restaurantId of ["r1", "r2"]) {
      const query = queries.get(restaurantId);
      expect(query?.eq).toHaveBeenCalledWith(
        "reviews.restaurant_id",
        restaurantId,
      );
      expect(query?.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
      expect(query?.limit).toHaveBeenCalledWith(1);
    }
  });

  it("omits restaurants with missing or failed photo queries", async () => {
    const { client } = setupClient({
      r1: {
        data: [
          {
            storage_path: "r1.jpg",
            reviews: { restaurant_id: "r1" },
          },
        ],
        error: null,
      },
      r2: { data: [], error: null },
      r3: { data: null, error: new Error("query failed") },
      r4: { throws: new Error("network failed") },
    });

    await expect(
      getRepresentativeRestaurantPhotoMap(["r1", "r2", "r3", "r4"]),
    ).resolves.toEqual(
      new Map([["r1", "https://photos.test/r1.jpg"]]),
    );
    expect(client.from).toHaveBeenCalledTimes(4);
    expect(mocks.createServiceRoleClient).toHaveBeenCalledTimes(1);
  });
});
