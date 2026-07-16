import Link from "next/link";
import { distanceInMeters } from "@/lib/geo";
import {
  buildRecommendReason,
  filterByRadius,
  filterCandidates,
  pickRecommendation,
  type RecommendCandidate,
} from "@/lib/recommend/engine";
import { getExclusionList, intersectWithCandidates } from "@/lib/recommend/exclusion-cookie";
import { normalizeRecommendParams, recommendConditionsSchema } from "@/lib/recommend/validation";
import { DEFAULT_RADIUS_M, RADIUS_OPTIONS_M, RESTAURANT_CATEGORIES } from "@/lib/restaurants/constants";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { rerollRecommendation, resetExclusions } from "./actions";

interface RecommendSearchParams {
  q?: string;
  menuQ?: string;
  category?: string;
  radius?: string;
  maxPrice?: string;
}

function RestaurantCard({
  restaurant,
  highlight,
  reason,
}: {
  restaurant: RecommendCandidate;
  highlight: boolean;
  reason?: string;
}) {
  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className={
        highlight
          ? "block rounded-2xl border-2 border-brand bg-brand-bg px-4 py-4"
          : "block rounded-2xl border border-neutral-200 px-4 py-3"
      }
    >
      <p className="font-semibold">{restaurant.name}</p>
      <p className="text-sm text-neutral-500">
        {restaurant.category} · {restaurant.distanceM}m
      </p>
      {reason && <p className="mt-1 text-sm text-brand-dark">{reason}</p>}
    </Link>
  );
}

export default async function RecommendPage({
  searchParams,
}: {
  searchParams: Promise<RecommendSearchParams>;
}) {
  const rawParams = await searchParams;

  const normalized = normalizeRecommendParams({
    restaurantName: rawParams.q,
    menuName: rawParams.menuQ,
    category: rawParams.category,
    radius: rawParams.radius,
    maxPriceWon: rawParams.maxPrice,
  });

  const parsed = recommendConditionsSchema.safeParse(normalized);

  if (!parsed.success) {
    return (
      <main className="flex flex-1 flex-col gap-4 px-6 py-8">
        <h1 className="text-xl font-bold text-brand-dark">오늘 뭐 먹지?</h1>
        <p className="text-sm text-red-600">
          {parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다."}
        </p>
        <Link href="/recommend" className="text-brand-dark underline">
          조건 없이 다시 시도
        </Link>
      </main>
    );
  }

  const conditions = parsed.data;

  const supabase = createServiceRoleClient();

  const { data: settings } = await supabase
    .from("app_settings")
    .select("company_lat, company_lng, default_radius_m")
    .eq("id", 1)
    .maybeSingle();

  const companyLat: number | null = settings?.company_lat ?? null;
  const companyLng: number | null = settings?.company_lng ?? null;
  const radius = conditions.radius ?? settings?.default_radius_m ?? DEFAULT_RADIUS_M;

  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name, category, lat, lng, menu_items(name, price, is_sold_out)")
    .eq("is_active", true);

  const candidates: RecommendCandidate[] = (restaurants ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    distanceM:
      companyLat !== null && companyLng !== null
        ? Math.round(distanceInMeters({ lat: companyLat, lng: companyLng }, { lat: r.lat, lng: r.lng }))
        : Number.POSITIVE_INFINITY,
    isActive: true,
    menuItems: (r.menu_items ?? [])
      .filter((m: { is_sold_out: boolean }) => !m.is_sold_out)
      .map((m: { name: string; price: number | null }) => ({ name: m.name, price: m.price })),
  }));

  const hasMenuData = candidates.some((c) => c.menuItems.length > 0);

  const withinRadius = filterByRadius(candidates, radius);
  const filtered = filterCandidates(withinRadius, conditions);

  const excludedFromCookie = await getExclusionList();
  const activeExclusions = intersectWithCandidates(
    excludedFromCookie,
    filtered.map((c) => c.id)
  );

  const result = pickRecommendation(filtered, { excludeIds: activeExclusions });

  let emptyMessage: string | null = null;
  if (companyLat === null || companyLng === null) {
    emptyMessage = "회사 위치 설정이 없어 추천할 수 없습니다. 관리자에게 문의해주세요.";
  } else if (withinRadius.length === 0) {
    emptyMessage = "설정하신 반경 안에 등록된 식당이 없어요. 반경을 넓혀보세요.";
  } else if (filtered.length === 0) {
    emptyMessage = "조건에 맞는 식당을 찾지 못했어요. 조건을 완화해보세요.";
  } else if (!result.main) {
    emptyMessage = "추천할 식당을 찾지 못했어요.";
  }

  const showResetButton = excludedFromCookie.length > 0;

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-8">
      <h1 className="text-xl font-bold text-brand-dark">오늘 뭐 먹지?</h1>

      <form method="get" className="flex flex-col gap-3">
        <input
          type="text"
          name="q"
          defaultValue={conditions.restaurantName ?? ""}
          placeholder="식당 이름 검색"
          className="rounded-2xl border border-neutral-200 px-4 py-3"
        />

        <div>
          <input
            type="text"
            name="menuQ"
            defaultValue={conditions.menuName ?? ""}
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
          defaultValue={conditions.category ?? ""}
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
            defaultValue={conditions.maxPriceWon ?? ""}
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

        <button type="submit" className="rounded-2xl bg-brand px-4 py-3 font-semibold text-white">
          이 조건으로 추천받기
        </button>
      </form>

      {emptyMessage ? (
        <p className="rounded-2xl bg-neutral-100 px-4 py-4 text-sm text-neutral-600">{emptyMessage}</p>
      ) : (
        result.main && (
          <div className="flex flex-col gap-3">
            {result.wasExclusionReset && (
              <p className="text-xs text-neutral-400">
                오늘 넘긴 식당을 포함해 다시 보여드렸어요. 조건에 맞는 새로운 후보가 더 없어요.
              </p>
            )}

            <RestaurantCard
              restaurant={result.main}
              highlight
              reason={buildRecommendReason(result.main, conditions)}
            />

            {result.alternatives.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-neutral-500">다른 후보</p>
                {result.alternatives.map((alt) => (
                  <RestaurantCard key={alt.id} restaurant={alt} highlight={false} />
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <form action={rerollRecommendation.bind(null, result.main.id, conditions)} className="flex-1">
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-brand-dark shadow-sm"
                >
                  다시 추천
                </button>
              </form>

              {showResetButton && (
                <form action={resetExclusions.bind(null, conditions)} className="flex-1">
                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-neutral-500 shadow-sm"
                  >
                    제외 목록 초기화
                  </button>
                </form>
              )}
            </div>
          </div>
        )
      )}
    </main>
  );
}
