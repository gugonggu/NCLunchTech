import { describe, expect, it } from "vitest";
import { toLunchAvailability } from "./queries";

describe("lunch availability queries", () => {
  it("maps a joined row into a public availability", () => {
    expect(
      toLunchAvailability({
        employee_id: "employee-1",
        status: "looking_for_company",
        employees: { nickname: "홍천" },
      }),
    ).toEqual({ employeeId: "employee-1", nickname: "홍천", status: "looking_for_company" });
  });

  it("drops a row whose employee join is missing", () => {
    expect(
      toLunchAvailability({
        employee_id: "employee-1",
        status: "eating_alone",
        employees: null,
      }),
    ).toBeNull();
  });
});
