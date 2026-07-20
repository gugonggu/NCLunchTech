import Link from "next/link";
import { getCurrentEmployee } from "@/lib/auth/session";
import { distanceInMeters } from "@/lib/geo";
import { DEFAULT_RADIUS_M, RADIUS_OPTIONS_M, RESTAURANT_CATEGORIES } from "@/lib/restaurants/constants";
import { isOpenNow, type OpenNowRow } from "@/lib/restaurants/hours-validation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { getReviewCounts } from "@/lib/reviews/queries";
import { RECENT_VISIT_WINDOW_DAYS } from "@/lib/recommend/engine";
import { getRecentCompletedVisits } from "@/lib/visits/queries";
import { getRecentAttendedAppointments } from "@/lib/appointments/queries";
import { daysBetweenDateStrings, getSeoulDateString } from "@/lib/visits/validation";

const RESULT_LIMIT = 60;

interface RestaurantsSearchParams {
  q?: string;
  menuQ?: string;
  category?: string;
  radius?: string;
  maxPrice?: string;
  openNow?: string;
  excludeRecent?: string;
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
  const menuQuery = params.menuQ?.trim() ?? "";
  const category = params.category ?? "";
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
  const openNowOnly = params.openNow === "on";
  const excludeRecent = params.excludeRecent === "on";
  const sort = params.sort === "new" ? "new" : params.sort === "reviews" ? "reviews" : "distance";

  const restaurants = await fetchAllRows((from, to) =>
    supabase
      .from("restaurants")
      .select(
        "id, name, category, address, lat, lng, created_at, menu_items(name, price, is_sold_out), restaurant_hours(day_of_week, is_closed, open_time, close_time)"
      )
      .eq("is_active", true)
      .range(from, to)
  );

  const now = new Date();
  const hasMenuData = restaurants.some((r) => (r.menu_items ?? []).length > 0);

  const employee = await getCurrentEmployee();
  let recentVisitDays = new Map<string, number>();
  if (employee) {
    const today = getSeoulDateString(now);
    const sinceDate = getSeoulDateString(new Date(now.getTime() - RECENT_VISIT_WINDOW_DAYS * 24 * 60 * 60 * 1000));
    const [recentVisits, recentAttendedAppointments] = await Promise.all([
      getRecentCompletedVisits(employee.id, sinceDate),
      getRecentAttendedAppointments(employee.id, sinceDate),
    ]);
    for (const visit of [...recentVisits, ...recentAttendedAppointments]) {
      const daysAgo = daysBetweenDateStrings(today, visit.visitDate);
      const existing = recentVisitDays.get(visit.restaurantId);
      if (existing === undefined || daysAgo < existing) {
        recentVisitDays.set(visit.restaurantId, daysAgo);
      }
    }
  }

  let list = restaurants.map((r) => {
    const activeMenuItems = (r.menu_items ?? []).filter(
      (m: { is_sold_out: boolean }) => !m.is_sold_out
    ) as { name: string; price: number | null }[];
    const hoursByDay = new Map<number, OpenNowRow>(
      (r.restaurant_hours ?? []).map(
        (h: { day_of_week: number; is_closed: boolean; open_time: string | null; close_time: string | null }) => [
          h.day_of_week,
          { dayOfWeek: h.day_of_week, isClosed: h.is_closed, openTime: h.open_time, closeTime: h.close_time },
        ]
      )
    );
    return {
      ...r,
      distanceM:
        companyLat !== null && companyLng !== null
          ? Math.round(distanceInMeters({ lat: companyLat, lng: companyLng }, { lat: r.lat, lng: r.lng }))
          : null,
      menuItems: activeMenuItems,
      isOpenNow: isOpenNow(hoursByDay, now),
    };
  });

  if (companyLat !== null && companyLng !== null) {
    list = list.filter((r) => r.distanceM !== null && r.distanceM <= radius);
  }

  if (category) {
    list = list.filter((r) => r.category === category);
  }

  if (query) {
    list = list.filter((r) => r.name.includes(query));
  }

  if (menuQuery) {
    list = list.filter((r) => r.menuItems.some((m) => m.name.includes(menuQuery)));
  }

  if (maxPrice !== undefined) {
    list = list.filter((r) => r.menuItems.some((m) => m.price !== null && m.price <= maxPrice));
  }

  if (openNowOnly) {
    list = list.filter((r) => r.isOpenNow);
  }

  if (excludeRecent) {
    list = list.filter((r) => {
      const daysAgo = recentVisitDays.get(r.id);
      return daysAgo === undefined || daysAgo >= RECENT_VISIT_WINDOW_DAYS;
    });
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
        <div>
          <input
            type="text"
            name="menuQ"
            defaultValue={menuQuery}
            placeholder="메뉴 이름 검색"
            disabled={!hasMenuData}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 disabled:bg-neutral-100 disabled:text-neutral-400"
          />
          {!hasMenuData && (
            <p className="mt-1 text-xs text-neutral-400">
              등록된 메뉴·가격 정보가 없어 현재 사용할 수 없습니다.
            </p>
          )}
        </div>
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
        <div>
          <input
            type="number"
            name="maxPrice"
            min={0}
            step={100}
            defaultValue={maxPrice ?? ""}
            placeholder="희망 가격(원) 이하"
            disabled={!hasMenuData}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 disabled:bg-neutral-100 disabled:text-neutral-400"
          />
          {!hasMenuData && (
            <p className="mt-1 text-xs text-neutral-400">
              등록된 메뉴·가격 정보가 없어 현재 사용할 수 없습니다.
            </p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input type="checkbox" name="openNow" defaultChecked={openNowOnly} />
          지금 영업 중인 곳만
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input type="checkbox" name="excludeRecent" defaultChecked={excludeRecent} />
          최근 방문 제외(최근 {RECENT_VISIT_WINDOW_DAYS}일 이내 다녀온 식당 제외)
        </label>
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
