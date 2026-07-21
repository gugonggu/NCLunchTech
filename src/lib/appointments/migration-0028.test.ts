import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/0028_appointment_restaurant_search.sql", "utf8");

describe("migration 0028", () => {
  it("defines a bounded service-role-only appointment restaurant search", () => {
    expect(sql).toMatch(/create or replace function public\.search_appointment_restaurants/i);
    expect(sql).toMatch(/security invoker/i);
    expect(sql).toMatch(/r\.is_active = true/i);
    expect(sql).toMatch(/timezone\('Asia\/Seoul', now\(\)\)/i);
    expect(sql).toMatch(/latitude_delta/i);
    expect(sql).toMatch(/longitude_delta/i);
    expect(sql).toMatch(/6371000/i);
    expect(sql).toMatch(/order by[\s\S]+r\.id/i);
    expect(sql).toMatch(/limit v_page_size/i);
    expect(sql).toMatch(/offset \(v_page - 1\) \* v_page_size/i);
    expect(sql).toMatch(/revoke execute on function public\.search_appointment_restaurants[\s\S]+from public/i);
    expect(sql).toMatch(/from anon/i);
    expect(sql).toMatch(/from authenticated/i);
    expect(sql).toMatch(/grant execute on function public\.search_appointment_restaurants[\s\S]+to service_role/i);
  });
});
