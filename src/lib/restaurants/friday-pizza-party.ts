import "server-only";
import { FRIDAY_PIZZA_PARTY_RESTAURANT_NAME } from "@/lib/friday-pizza-party";
import { createServiceRoleClient } from "@/lib/supabase/server";

const seoulWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  weekday: "short",
});

export function isFridayInSeoul(now: Date): boolean {
  return seoulWeekdayFormatter.format(now) === "Fri";
}

export async function getFridayPizzaPartyRestaurant(): Promise<{ id: string } | null> {
  const { data } = await createServiceRoleClient()
    .from("restaurants")
    .select("id")
    .eq("name", FRIDAY_PIZZA_PARTY_RESTAURANT_NAME)
    .eq("is_active", true)
    .maybeSingle();

  return data ? { id: data.id } : null;
}
