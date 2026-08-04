import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(process.cwd(), "supabase", "migrations", "0064_monthly_leaderboard_history.sql");
const sql = readFileSync(migrationPath, "utf8").toLowerCase();

describe("0064 monthly leaderboard history migration", () => {
  it("allows snapshot creation through the atomic finalizer but denies direct application-role writes", () => {
    expect(sql).toMatch(/create function public\.finalize_monthly_leaderboard[\s\S]*?security definer/);
    expect(sql).toContain("grant execute on function public.finalize_monthly_leaderboard(date, jsonb) to service_role");

    for (const table of ["monthly_leaderboard_periods", "monthly_leaderboard_entries"]) {
      for (const role of ["public", "anon", "authenticated", "service_role"]) {
        expect(sql).toContain(`revoke insert, update, delete, truncate on table public.${table} from ${role}`);
      }
    }
  });
});
