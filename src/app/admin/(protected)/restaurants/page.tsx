import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { SyncKakaoButton } from "./SyncKakaoButton";
import { getAdminStatusMessage, RESTAURANT_ADMIN_STATUS_MESSAGES } from "@/lib/admin/status-messages";

const RESULT_LIMIT = 60;

export default async function AdminRestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const query = q?.trim() ?? "";
  const feedbackMessage = getAdminStatusMessage(RESTAURANT_ADMIN_STATUS_MESSAGES, status);

  const supabase = createServiceRoleClient();
  const restaurants = await fetchAllRows((from, to) =>
    supabase
      .from("restaurants")
      .select("id, name, category, address, is_active, excluded_from_recommend")
      .order("created_at", { ascending: false })
      .range(from, to)
  );

  const filtered = query ? restaurants.filter((r) => r.name.includes(query)) : restaurants;
  const visible = filtered.slice(0, RESULT_LIMIT);

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-12">
      <Link href="/admin" className="text-sm text-neutral-500">
        ← 관리자 홈으로
      </Link>

      <h1 className="text-xl font-bold text-brand-dark">식당 관리</h1>

      {feedbackMessage && <p className="text-sm text-brand-dark">{feedbackMessage}</p>}

      <div className="flex gap-2">
        <SyncKakaoButton />
        <Link
          href="/admin/restaurants/import"
          className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-brand-dark shadow-sm"
        >
          CSV 업로드
        </Link>
      </div>

      <form method="get" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="식당 이름 검색"
          className="flex-1 rounded-2xl border border-neutral-200 px-4 py-3"
        />
        <button type="submit" className="rounded-2xl bg-brand px-4 py-3 font-semibold text-white">
          검색
        </button>
      </form>

      <p className="text-sm text-neutral-500">
        {filtered.length}건 중 {visible.length}건 표시
        {filtered.length > RESULT_LIMIT && " (검색어로 좁혀보세요)"}
      </p>

      <ul className="flex flex-col gap-2">
        {visible.map((r) => (
          <li key={r.id}>
            <Link
              href={`/admin/restaurants/${r.id}`}
              className="block rounded-2xl border border-neutral-200 px-4 py-3"
            >
              <p className="font-semibold">{r.name}</p>
              <p className="text-sm text-neutral-500">
                {r.category} · {r.address}
                {!r.is_active && " · 비활성"}
                {r.excluded_from_recommend && " · 추천 제외"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
