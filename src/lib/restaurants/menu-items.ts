import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** menuItemId가 실제로 restaurantId 소속인 경우에만 해당 메뉴 행을 반환한다. */
export async function getMenuItemInRestaurant(restaurantId: string, menuItemId: string) {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("id", menuItemId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
}
