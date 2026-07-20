import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(process.cwd(), "supabase", "migrations", "0012_meal_records.sql");
const sql = readFileSync(migrationPath, "utf8").toLowerCase();

describe("0012 meal_records migration", () => {
  it("stores one personal visit or appointment source", () => {
    expect(sql).toContain("create table meal_records");
    expect(sql).toMatch(/check\s*\(\s*\(visit_id is not null\)\s*<>\s*\(appointment_id is not null\)\s*\)/);
    expect(sql).toContain("on meal_records (visit_id) where visit_id is not null");
    expect(sql).toContain(
      "on meal_records (employee_id, appointment_id) where appointment_id is not null"
    );
  });

  it("keeps menu and price snapshots within the agreed limits", () => {
    expect(sql).toContain("menu_item_id uuid references menu_items (id) on delete set null");
    expect(sql).toMatch(/char_length\(btrim\(menu_name_snapshot\)\) between 1 and 100/);
    expect(sql).toMatch(/paid_price between 0 and 10000000/);
  });

  it("enables RLS without adding client policies", () => {
    expect(sql).toContain("alter table meal_records enable row level security");
    expect(sql).not.toContain("create policy");
  });
});
