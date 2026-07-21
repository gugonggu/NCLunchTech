import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/0028_appointment_restaurant_search.sql", "utf8");

describe("migration 0028", () => {
  it("defines a bounded service-role-only appointment restaurant search", () => {
    const signature = "public.search_appointment_restaurants(text, text, integer, boolean, text, integer, integer)";

    expect(sql).toMatch(
      /create or replace function public\.search_appointment_restaurants\(\s*p_query text,\s*p_category text,\s*p_radius_m integer,\s*p_open_now boolean,\s*p_sort text,\s*p_page integer,\s*p_page_size integer\s*\)/i,
    );
    expect(sql).toMatch(/security invoker/i);
    expect(sql).toMatch(/r\.is_active = true/i);
    expect(sql).toMatch(/timezone\('Asia\/Seoul', now\(\)\)/i);
    expect(sql).toMatch(/latitude_delta/i);
    expect(sql).toMatch(/longitude_delta/i);
    expect(sql).toMatch(/6371000/i);
    expect(sql).toMatch(/order by[\s\S]+r\.id/i);
    expect(sql).toMatch(/limit v_page_size/i);
    expect(sql).toMatch(/offset \(v_page - 1\) \* v_page_size/i);
    expect(sql).toMatch(/select c\.total_count into v_total_count from counted c/i);
    expect(sql).toContain(`revoke execute on function ${signature} from public;`);
    expect(sql).toContain(`revoke execute on function ${signature} from anon;`);
    expect(sql).toContain(`revoke execute on function ${signature} from authenticated;`);
    expect(sql).toContain(`grant execute on function ${signature} to service_role;`);
  });
});
