import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("migration 0041", () => {
  it("adds atomic authentication and reaction RPCs", () => {
    const sql = readFileSync("supabase/migrations/0041_atomic_auth_and_reactions.sql", "utf8");

    expect(sql).toContain("create or replace function public.record_employee_login_attempt");
    expect(sql).toContain("create or replace function public.toggle_favorite");
    expect(sql).toContain("create or replace function public.toggle_review_reaction");
    expect(sql).toContain("pg_advisory_xact_lock");
  });
});
