import { describe, expect, it } from "vitest";
import { dedupePartnerIds } from "./dining-partners";

describe("dedupePartnerIds", () => {
  it("본인을 제외하고 중복 없는 동료 id 집합을 만든다", () => {
    const result = dedupePartnerIds(
      [{ partnerId: "e-1" }, { partnerId: "e-2" }, { partnerId: "e-1" }, { partnerId: "me" }],
      "me"
    );
    expect(result).toEqual(new Set(["e-1", "e-2"]));
  });

  it("동료가 없으면 빈 집합이다", () => {
    expect(dedupePartnerIds([], "me")).toEqual(new Set());
  });
});
