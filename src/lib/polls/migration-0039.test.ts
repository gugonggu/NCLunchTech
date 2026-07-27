import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("migration 0039", () => {
  it("adds an atomic vote RPC that locks the poll and validates its option", () => {
    const sql = readFileSync("supabase/migrations/0039_atomic_poll_vote.sql", "utf8");

    expect(sql).toContain("create or replace function public.cast_poll_vote");
    expect(sql).toContain("for update");
    expect(sql).toContain("closes_at <= now()");
    expect(sql).toContain("id = p_option_id");
  });
});
