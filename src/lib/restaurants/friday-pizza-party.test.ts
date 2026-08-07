import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  isActiveEq: vi.fn(),
  nameEq: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({ from: mocks.from }),
}));

import { getFridayPizzaPartyRestaurant, isFridayInSeoul } from "./friday-pizza-party";

describe("isFridayInSeoul", () => {
  it("uses the Seoul calendar instead of the server timezone", () => {
    expect(isFridayInSeoul(new Date("2026-08-06T15:30:00.000Z"))).toBe(true);
    expect(isFridayInSeoul(new Date("2026-08-07T15:30:00.000Z"))).toBe(false);
  });
});

describe("getFridayPizzaPartyRestaurant", () => {
  it("returns only the exact active Papajohns store", async () => {
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ eq: mocks.nameEq });
    mocks.nameEq.mockReturnValue({ eq: mocks.isActiveEq });
    mocks.isActiveEq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
    mocks.maybeSingle.mockResolvedValue({ data: { id: "pizza-1" } });

    await expect(getFridayPizzaPartyRestaurant()).resolves.toEqual({ id: "pizza-1" });
    expect(mocks.nameEq).toHaveBeenCalledWith("name", "파파존스 센텀시티점");
    expect(mocks.isActiveEq).toHaveBeenCalledWith("is_active", true);
  });
});
