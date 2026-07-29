import { describe, expect, it } from "vitest";
import { groupLunchAvailabilities, isLunchAvailabilityStatus } from "./validation";

describe("lunch availability validation", () => {
  it("accepts only the five supported statuses", () => {
    expect(isLunchAvailabilityStatus("looking_for_company")).toBe(true);
    expect(isLunchAvailabilityStatus("eating_lunchbox")).toBe(true);
    expect(isLunchAvailabilityStatus("away_or_skipping")).toBe(true);
    expect(isLunchAvailabilityStatus("working")).toBe(false);
  });

  it("groups public statuses in their fixed display order", () => {
    expect(
      groupLunchAvailabilities([
        { employeeId: "e2", nickname: "나래", status: "eating_alone" },
        { employeeId: "e1", nickname: "가온", status: "looking_for_company" },
        { employeeId: "e3", nickname: "다인", status: "eating_lunchbox" },
      ]),
    ).toEqual([
      { status: "looking_for_company", employees: [{ employeeId: "e1", nickname: "가온" }] },
      { status: "has_appointment", employees: [] },
      { status: "eating_alone", employees: [{ employeeId: "e2", nickname: "나래" }] },
      { status: "eating_lunchbox", employees: [{ employeeId: "e3", nickname: "다인" }] },
      { status: "away_or_skipping", employees: [] },
    ]);
  });
});
