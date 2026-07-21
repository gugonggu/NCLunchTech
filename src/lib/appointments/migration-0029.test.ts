import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("migration 0029", () => {
  it("makes the appointment search function resolve ambiguous identifiers as columns", () => {
    const sql = readFileSync("supabase/migrations/0029_fix_appointment_restaurant_search_rpc.sql", "utf8");

    expect(sql).toMatch(/pg_get_functiondef/i);
    expect(sql).toMatch(/#variable_conflict use_column/i);
  });
});
