import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import {
  buildCategoryBreakdown,
  getFavoriteRestaurantIds,
  getLatestMealRecordsByRestaurant,
  getVisitedRestaurantIds,
} from "@/lib/collection/queries";
import { RESTAURANT_CATEGORIES } from "@/lib/restaurants/constants";
import { buttonStyles } from "@/components/ui/Button";
import { toggleFavorite } from "@/app/restaurants/[id]/actions";

const RESULT_LIMIT = 60;

interface CollectionSearchParams {
  category?: string;
  visited?: string;
  favoritesOnly?: string;
}

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<CollectionSearchParams>;
}) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent("/collection")}`);
  }

  const params = await searchParams;
  const category = params.category ?? "";
  const visited = params.visited === "visited" || params.visited === "unvisited" ? params.visited : "";
  const favoritesOnly = params.favoritesOnly === "on";

  const supabase = createServiceRoleClient();
  const allRestaurants = await fetchAllRows((from, to) =>
    supabase.from("restaurants").select("id, name, category").eq("is_active", true).range(from, to)
  );

  const [visitedIds, favoriteIds, latestMealRecords] = await Promise.all([
    getVisitedRestaurantIds(employee.id),
    getFavoriteRestaurantIds(employee.id),
    getLatestMealRecordsByRestaurant(employee.id),
  ]);

  const breakdown = buildCategoryBreakdown(RESTAURANT_CATEGORIES, allRestaurants, visitedIds);

  let list = allRestaurants;
  if (category) {
    list = list.filter((r) => r.category === category);
  }
  if (visited === "visited") {
    list = list.filter((r) => visitedIds.has(r.id));
  } else if (visited === "unvisited") {
    list = list.filter((r) => !visitedIds.has(r.id));
  }
  if (favoritesOnly) {
    list = list.filter((r) => favoriteIds.has(r.id));
  }
  list = [...list].sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const total = list.length;
  const visible = list.slice(0, RESULT_LIMIT);

  const favoriteRestaurants = allRestaurants.filter((r) => favoriteIds.has(r.id));

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-8">
      <Link href="/" className="text-sm text-ink-muted">
        ← 홈으로
      </Link>

      <h1 className="text-2xl font-extrabold tracking-tight text-brand-dark sm:text-3xl">도감</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold tracking-tight text-brand-dark">분류별 현황</h2>
        <ul className="grid grid-cols-3 gap-2">
          {breakdown.map((b) => (
            <li key={b.category} className="rounded-card bg-surface px-3 py-3 text-center shadow-card">
              <p className="text-xs text-ink-muted">{b.category}</p>
              <p className="text-sm font-semibold tabular-nums text-brand-dark">
                {b.visitedCount}/{b.totalCount}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {favoriteRestaurants.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-brand-dark">즐겨찾기</h2>
          <ul className="flex flex-col gap-2">
            {favoriteRestaurants.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/restaurants/${r.id}`}
                  className="block rounded-card bg-surface px-4 py-3 shadow-card transition active:scale-[0.98]"
                >
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-sm text-ink-muted">
                    {r.category}
                    {visitedIds.has(r.id) ? " · 방문 완료" : " · 미방문"}
                  </p>
                  {latestMealRecords.get(r.id) && (
                    <p className="text-sm tabular-nums text-ink-muted">
                      {latestMealRecords.get(r.id)!.menuName} ·{" "}
                      {latestMealRecords.get(r.id)!.paidPrice.toLocaleString("ko-KR")}원
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold tracking-tight text-brand-dark">전체 식당</h2>

        <form method="get" className="flex flex-col gap-3">
          <select
            name="category"
            defaultValue={category}
            className="rounded-control border border-line px-4 py-3"
          >
            <option value="">전체 분류</option>
            {RESTAURANT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            name="visited"
            defaultValue={visited}
            className="rounded-control border border-line px-4 py-3"
          >
            <option value="">전체</option>
            <option value="visited">방문한 곳만</option>
            <option value="unvisited">미방문만</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input type="checkbox" name="favoritesOnly" defaultChecked={favoritesOnly} />
            즐겨찾기만 보기
          </label>
          <button type="submit" className={buttonStyles({ block: true })}>
            적용
          </button>
        </form>

        <p className="text-sm tabular-nums text-ink-muted">
          {total}건 중 {visible.length}건 표시
          {total > RESULT_LIMIT && " (분류나 필터로 좁혀보세요)"}
        </p>

        <ul className="flex flex-col gap-2">
          {visible.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-card bg-surface px-4 py-3 shadow-card"
            >
              <Link href={`/restaurants/${r.id}`} className="flex-1">
                <p className="font-semibold">{r.name}</p>
                <p className="text-sm text-ink-muted">
                  {r.category}
                  {visitedIds.has(r.id) ? " · 방문 완료" : " · 미방문"}
                </p>
                {latestMealRecords.get(r.id) && (
                  <p className="text-sm tabular-nums text-ink-muted">
                    {latestMealRecords.get(r.id)!.menuName} ·{" "}
                    {latestMealRecords.get(r.id)!.paidPrice.toLocaleString("ko-KR")}원
                  </p>
                )}
              </Link>
              <form action={toggleFavorite.bind(null, r.id)}>
                <button
                  type="submit"
                  className="px-2 text-xl transition active:scale-[0.98]"
                  aria-label="즐겨찾기 토글"
                >
                  {favoriteIds.has(r.id) ? "★" : "☆"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
