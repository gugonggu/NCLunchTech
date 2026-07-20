import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { SyncKakaoButton } from "./SyncKakaoButton";

export default async function AdminRestaurantsPage() {
  const supabase = createServiceRoleClient();
  const restaurants = await fetchAllRows((from, to) =>
    supabase
      .from("restaurants")
      .select("id, name, category, address")
      .order("created_at", { ascending: false })
      .range(from, to)
  );

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-12">
      <h1 className="text-xl font-bold text-brand-dark">식당 관리</h1>
      <SyncKakaoButton />
      <ul className="flex flex-col gap-2">
        {restaurants.map((r) => (
          <li key={r.id} className="rounded-2xl border border-neutral-200 px-4 py-3">
            <p className="font-semibold">{r.name}</p>
            <p className="text-sm text-neutral-500">
              {r.category} · {r.address}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
