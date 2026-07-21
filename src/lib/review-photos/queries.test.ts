import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

import { getRepresentativeRestaurantPhotoMap } from "./queries";

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
    const limit = vi.fn().mockResolvedValue({ data: rows });
    const order = vi.fn(() => ({ limit }));
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
});
