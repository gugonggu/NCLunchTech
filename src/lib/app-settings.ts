import "server-only";
import { unstable_cache } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";

async function fetchHomeAppSettings() {
  const { data } = await createServiceRoleClient()
      .from("app_settings")
      .select("company_lat, company_lng, announcement")
      .eq("id", 1)
      .maybeSingle();
  return data;
}

const getCachedHomeAppSettings = unstable_cache(fetchHomeAppSettings, ["home-app-settings"], { revalidate: 60 });

export function getHomeAppSettings() {
  return process.env.NODE_ENV === "test" ? fetchHomeAppSettings() : getCachedHomeAppSettings();
}
