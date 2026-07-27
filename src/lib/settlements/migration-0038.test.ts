import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("migration 0038", () => {
  it("adds one transactional settlement upsert RPC", () => {
    const sql = readFileSync("supabase/migrations/0038_atomic_settlement_upsert.sql", "utf8");

    expect(sql).toContain("create or replace function public.upsert_settlement");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("delete from settlement_shares");
    expect(sql).toContain("grant execute on function public.upsert_settlement");
  });
});
