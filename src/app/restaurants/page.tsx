import Link from "next/link";
import { distanceInMeters } from "@/lib/geo";
import { DEFAULT_RADIUS_M, RADIUS_OPTIONS_M, RESTAURANT_CATEGORIES } from "@/lib/restaurants/constants";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getReviewCounts } from "@/lib/reviews/queries";

const RESULT_LIMIT = 60;

interface RestaurantsSearchParams {
  q?: string;
  category?: string;
  radius?: string;
  sort?: string;
  forAppointment?: string;
}

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<RestaurantsSearchParams>;
}) {
  const params = await searchParams;
  const { forAppointment } = params;
  const supabase = createServiceRoleClient();

  const { data: settings } = await supabase
    .from("app_settings")
    .select("company_lat, company_lng, default_radius_m")
    .eq("id", 1)
    .maybeSingle();

  const companyLat: number | null = settings?.company_lat ?? null;
  const companyLng: number | null = settings?.company_lng ?? null;
  const radius = Number(params.radius) || settings?.default_radius_m || DEFAULT_RADIUS_M;
  const query = params.q?.trim() ?? "";
  const category = params.category ?? "";
  const sort = params.sort === "new" ? "new" : params.sort === "reviews" ? "reviews" : "distance";

  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name, category, address, lat, lng, created_at")
    .eq("is_active", true);

  let list = (restaurants ?? []).map((r) => ({
    ...r,
    distanceM:
      companyLat !== null && companyLng !== null
        ? Math.round(distanceInMeters({ lat: companyLat, lng: companyLng }, { lat: r.lat, lng: r.lng }))
        : null,
  }));

  if (companyLat !== null && companyLng !== null) {
    list = list.filter((r) => r.distanceM !== null && r.distanceM <= radius);
  }

  if (category) {
    list = list.filter((r) => r.category === category);
  }

  if (query) {
    list = list.filter((r) => r.name.includes(query));
  }

  const reviewCounts =
    sort === "reviews" ? await getReviewCounts(list.map((r) => r.id)) : new Map<string, number>();

  if (sort === "new") {
    list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  } else if (sort === "reviews") {
    list.sort((a, b) => (reviewCounts.get(b.id) ?? 0) - (reviewCounts.get(a.id) ?? 0));
  } else {
    list.sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
  }

  const total = list.length;
  const visible = list.slice(0, RESULT_LIMIT);

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-8">
      <h1 className="text-xl font-bold text-brand-dark">식당 찾기</h1>

      {forAppointment && (
        <p className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
          약속의 식당을 변경할 곳을 골라주세요.
        </p>
      )}

      <form method="get" className="flex flex-col gap-3">
        {forAppointment && <input type="hidden" name="forAppointment" value={forAppointment} />}
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="식당 이름 검색"
          className="rounded-2xl border border-neutral-200 px-4 py-3"
        />
        <select
          name="category"
          defaultValue={category}
          className="rounded-2xl border border-neutral-200 px-4 py-3"
        >
          <option value="">전체 분류</option>
          {RESTAURANT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          name="radius"
          defaultValue={String(radius)}
          className="rounded-2xl border border-neutral-200 px-4 py-3"
        >
          {RADIUS_OPTIONS_M.map((r) => (
            <option key={r} value={r}>
              {r < 1000 ? `${r}m` : `${r / 1000}km`}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort}
          className="rounded-2xl border border-neutral-200 px-4 py-3"
        >
          <option value="distance">가까운순</option>
          <option value="new">신규순</option>
          <option value="reviews">리뷰 많은순</option>
        </select>
        <button type="submit" className="rounded-2xl bg-brand px-4 py-3 font-semibold text-white">
          검색
        </button>
      </form>

      <p className="text-sm text-neutral-500">
        {total}건 중 {visible.length}건 표시
        {total > RESULT_LIMIT && " (검색어나 분류로 좁혀보세요)"}
      </p>

      <ul className="flex flex-col gap-2">
        {visible.map((r) => (
          <li key={r.id}>
            <Link
              href={
                forAppointment
                  ? `/restaurants/${r.id}?forAppointment=${forAppointment}`
                  : `/restaurants/${r.id}`
              }
              className="block rounded-2xl border border-neutral-200 px-4 py-3"
            >
              <p className="font-semibold">{r.name}</p>
              <p className="text-sm text-neutral-500">
                {r.category} · {r.address}
                {r.distanceM !== null && ` · ${r.distanceM}m`}
                {sort === "reviews" && ` · 리뷰 ${reviewCounts.get(r.id) ?? 0}개`}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
