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

function setupClient(rows: PhotoRow[]) {
  const orderedQuery = {
    limit: vi.fn((count: number) =>
      Promise.resolve({ data: rows.slice(0, count) }),
    ),
    then: (
      resolve: (value: { data: PhotoRow[] }) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve({ data: rows }).then(resolve, reject),
  };
  const order = vi.fn(() => orderedQuery);
  const inFilter = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ in: inFilter }));
  const storageFrom = vi.fn(() => ({
    getPublicUrl: (path: string) => ({
      data: { publicUrl: `https://photos.test/${path}` },
    }),
  }));
  const client = {
    from: vi.fn(() => ({ select })),
    storage: { from: storageFrom },
  };
  mocks.createServiceRoleClient.mockReturnValue(client);

  return { inFilter, order };
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

  it("keeps the newest photo for each restaurant", async () => {
    const rows = [
      {
        storage_path: "new-r1.jpg",
        reviews: { restaurant_id: "r1" },
      },
      {
        storage_path: "old-r1.jpg",
        reviews: { restaurant_id: "r1" },
      },
      {
        storage_path: "new-r2.jpg",
        reviews: { restaurant_id: "r2" },
      },
    ];
    const { inFilter, order } = setupClient(rows);

    await expect(
      getRepresentativeRestaurantPhotoMap(["r1", "r2"]),
    ).resolves.toEqual(
      new Map([
        ["r1", "https://photos.test/new-r1.jpg"],
        ["r2", "https://photos.test/new-r2.jpg"],
      ]),
    );

    expect(inFilter).toHaveBeenCalledWith("reviews.restaurant_id", [
      "r1",
      "r2",
    ]);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("returns every requested restaurant when newer photos belong to one restaurant", async () => {
    const rows = [
      ...Array.from({ length: 21 }, (_, index) => ({
        storage_path: `r1-${index}.jpg`,
        reviews: { restaurant_id: "r1" },
      })),
      {
        storage_path: "r2-older.jpg",
        reviews: { restaurant_id: "r2" },
      },
    ];
    setupClient(rows);

    await expect(
      getRepresentativeRestaurantPhotoMap(["r1", "r2"]),
    ).resolves.toEqual(
      new Map([
        ["r1", "https://photos.test/r1-0.jpg"],
        ["r2", "https://photos.test/r2-older.jpg"],
      ]),
    );
  });
});
