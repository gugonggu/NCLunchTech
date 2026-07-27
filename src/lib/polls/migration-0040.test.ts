import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("migration 0040", () => {
  it("repairs the remote vote RPC option lookup", () => {
    const sql = readFileSync("supabase/migrations/0040_fix_poll_vote.sql", "utf8");

    expect(sql).toContain("create or replace function public.cast_poll_vote");
    expect(sql).toContain("id = p_option_id");
  });
});
