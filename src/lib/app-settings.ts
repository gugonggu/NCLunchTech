import "server-only";
import { unstable_cache } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const getHomeAppSettings = unstable_cache(
  async () => {
    const { data } = await createServiceRoleClient()
      .from("app_settings")
      .select("company_lat, company_lng, announcement")
      .eq("id", 1)
      .maybeSingle();
    return data;
  },
  ["home-app-settings"],
  { revalidate: 60 }
);
