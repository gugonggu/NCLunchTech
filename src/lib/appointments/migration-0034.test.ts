import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("migration 0034", () => {
  it("adds public appointment fields and an atomic approval function", () => {
    const sql = readFileSync("supabase/migrations/0034_public_appointment_recruitment.sql", "utf8");

    expect(sql).toMatch(/is_public boolean not null default false/i);
    expect(sql).toMatch(/capacity smallint/i);
    expect(sql).toMatch(/capacity between 2 and 10/i);
    expect(sql).toMatch(/create or replace function public\.approve_public_appointment_applicant/i);
    expect(sql).toMatch(/for update/i);
  });
});
