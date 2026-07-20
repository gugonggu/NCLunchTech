import { describe, expect, it } from "vitest";
import { isCompletedMealSource, isMealStatusCode, mealRecordSchema, mealSourceSchema } from "./validation";

describe("mealRecordSchema", () => {
  it("accepts one registered menu and an integer price", () => {
    const result = mealRecordSchema.safeParse({
      menuItemId: "11111111-1111-4111-8111-111111111111",
      customMenuName: "",
      paidPrice: "0",
    });
    expect(result.success).toBe(true);
  });

  it("accepts one custom menu up to 100 characters", () => {
    const result = mealRecordSchema.safeParse({
      menuItemId: "",
      customMenuName: "a".repeat(100),
      paidPrice: "10000000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects selecting both or neither menu input", () => {
    const menuItemId = "11111111-1111-4111-8111-111111111111";
    expect(mealRecordSchema.safeParse({ menuItemId, customMenuName: "직접 메뉴", paidPrice: "8000" }).success).toBe(
      false
    );
    expect(mealRecordSchema.safeParse({ menuItemId: "", customMenuName: "", paidPrice: "8000" }).success).toBe(false);
  });

  it("rejects an overlong menu name", () => {
    expect(
      mealRecordSchema.safeParse({ menuItemId: "", customMenuName: "a".repeat(101), paidPrice: "8000" }).success
    ).toBe(false);
  });

  it("rejects negative, fractional, nonnumeric, and excessive prices", () => {
    for (const paidPrice of ["-1", "1.5", "만원", "10000001"]) {
      expect(mealRecordSchema.safeParse({ menuItemId: "", customMenuName: "메뉴", paidPrice }).success).toBe(false);
    }
  });
});

describe("mealSourceSchema", () => {
  const visitId = "11111111-1111-4111-8111-111111111111";
  const appointmentId = "22222222-2222-4222-8222-222222222222";

  it("accepts exactly one UUID source", () => {
    expect(mealSourceSchema.safeParse({ visitId }).success).toBe(true);
    expect(mealSourceSchema.safeParse({ appointmentId }).success).toBe(true);
  });

  it("rejects both, neither, and invalid IDs", () => {
    expect(mealSourceSchema.safeParse({ visitId, appointmentId }).success).toBe(false);
    expect(mealSourceSchema.safeParse({}).success).toBe(false);
    expect(mealSourceSchema.safeParse({ visitId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("isCompletedMealSource", () => {
  const employeeId = "employee-1";
  const restaurantId = "restaurant-1";

  it("accepts only a completed personal visit owned by the employee at the restaurant", () => {
    const source = { kind: "visit" as const, employeeId, restaurantId, status: "completed" };
    expect(isCompletedMealSource(source, employeeId, restaurantId)).toBe(true);
    expect(isCompletedMealSource({ ...source, status: "planned" }, employeeId, restaurantId)).toBe(false);
    expect(isCompletedMealSource(source, "employee-2", restaurantId)).toBe(false);
    expect(isCompletedMealSource(source, employeeId, "restaurant-2")).toBe(false);
  });

  it("accepts a completed host or completed participant for the appointment restaurant", () => {
    const source = {
      kind: "appointment" as const,
      restaurantId,
      hostEmployeeId: employeeId,
      hostAttendanceStatus: "completed",
      participantEmployeeId: null,
      participantStatus: null,
    };
    expect(isCompletedMealSource(source, employeeId, restaurantId)).toBe(true);
    expect(
      isCompletedMealSource(
        {
          ...source,
          hostEmployeeId: "employee-2",
          hostAttendanceStatus: null,
          participantEmployeeId: employeeId,
          participantStatus: "completed",
        },
        employeeId,
        restaurantId
      )
    ).toBe(true);
  });

  it("rejects incomplete or injected appointment data", () => {
    const source = {
      kind: "appointment" as const,
      restaurantId,
      hostEmployeeId: "employee-2",
      hostAttendanceStatus: "completed",
      participantEmployeeId: employeeId,
      participantStatus: "accepted",
    };
    expect(isCompletedMealSource(source, employeeId, restaurantId)).toBe(false);
    expect(isCompletedMealSource(source, employeeId, "restaurant-2")).toBe(false);
    expect(isCompletedMealSource({ ...source, participantStatus: "completed" }, employeeId, restaurantId)).toBe(true);
  });
});

describe("isMealStatusCode", () => {
  it("accepts only known result codes", () => {
    for (const code of ["saved", "invalid_input", "invalid_source", "invalid_menu"]) {
      expect(isMealStatusCode(code)).toBe(true);
    }
    expect(isMealStatusCode("<script>alert(1)</script>")).toBe(false);
    expect(isMealStatusCode("constructor")).toBe(false);
    expect(isMealStatusCode("toString")).toBe(false);
    expect(isMealStatusCode("__proto__")).toBe(false);
    expect(isMealStatusCode(undefined)).toBe(false);
  });
});
