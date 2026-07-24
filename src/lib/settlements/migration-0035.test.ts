import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("migration 0037", () => {
  it("stores the settlement split mode and rounding recipient", () => {
    const sql = readFileSync("supabase/migrations/0037_settlement_split_modes.sql", "utf8");

    expect(sql).toMatch(/split_mode text not null default 'equal'/i);
    expect(sql).toMatch(/rounding_employee_id uuid references employees/i);
    expect(sql).toMatch(/rounding_unit in \(1, 10, 100, 1000\)/i);
  });
});
