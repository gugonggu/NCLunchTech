import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("migration 0042", () => {
  it("allows public recruitment notification types", () => {
    const sql = readFileSync("supabase/migrations/0042_public_appointment_notification_types.sql", "utf8");

    expect(sql).toContain("appointment_applied");
    expect(sql).toContain("appointment_application_accepted");
    expect(sql).toContain("appointment_application_declined");
  });
});
