import Link from "next/link";
import { RecommendationCard } from "@/components/lunch/RecommendationCard";
import { Button, buttonStyles } from "@/components/ui/Button";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { getCurrentEmployee } from "@/lib/auth/session";
import { distanceInMeters } from "@/lib/geo";
import {
  buildRecommendReasons,
  filterByRadius,
  filterCandidates,
  pickRecommendation,
  RECENT_VISIT_WINDOW_DAYS,
  type RecentVisitDaysMap,
  type RecommendCandidate,
} from "@/lib/recommend/engine";
import { getExclusionList, intersectWithCandidates } from "@/lib/recommend/exclusion-cookie";
import { normalizeRecommendParams, recommendConditionsSchema } from "@/lib/recommend/validation";
import { getRepresentativeRestaurantPhotoMap } from "@/lib/review-photos/queries";
import { getExcludingBusinessStatusMap, getFreshCongestionValueMap } from "@/lib/status-reports/queries";
import { RecommendMapView, type RecommendMapPoint } from "./RecommendMapView";
import { DEFAULT_RADIUS_M } from "@/lib/restaurants/constants";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { daysBetweenDateStrings, getSeoulDateString } from "@/lib/visits/validation";
import { getRecentCompletedVisits } from "@/lib/visits/queries";
import { getRecentAttendedAppointments } from "@/lib/appointments/queries";
import { getReviewAggregates, getReviewCounts } from "@/lib/reviews/queries";
import { hasFastServiceSignal, hasGoodRatingSignal } from "@/lib/reviews/validation";
import {
  getFavoriteRestaurantIds,
  getGloballyVisitedRestaurantIds,
  getVisitedRestaurantIds,
} from "@/lib/collection/queries";
import { decideRestaurant } from "@/app/visits/actions";
import { rerollRecommendation, rerollRoulette, resetExclusions } from "./actions";
import { RecommendationFilters } from "./RecommendationFilters";
import { ResponsiveFilterPanel } from "./ResponsiveFilterPanel";
import { RouletteResult } from "./RouletteResult";
import { buildRouletteUrl } from "@/lib/recommend/urls";

interface RecommendSearchParams {
  q?: string;
  menuQ?: string;
  category?: string;
  radius?: string;
  maxPrice?: string;
  excludeRecent?: string;
  excludeCongested?: string;
  preferFavorites?: string;
  preferGoodRating?: string;
  preferFast?: string;
  preferUnvisited?: string;
  roulette?: string;
}

export default async function RecommendPage({
  searchParams,
}: {
  searchParams: Promise<RecommendSearchParams>;
}) {
  const rawParams = await searchParams;
  const rouletteMode = rawParams.roulette === "on";

  const normalized = normalizeRecommendParams({
    restaurantName: rawParams.q,
    menuName: rawParams.menuQ,
    category: rawParams.category,
    radius: rawParams.radius,
    maxPriceWon: rawParams.maxPrice,
    excludeRecentVisits: rawParams.excludeRecent,
    excludeCongested: rawParams.excludeCongested,
    preferFavorites: rawParams.preferFavorites,
    preferGoodRating: rawParams.preferGoodRating,
    preferFast: rawParams.preferFast,
    preferUnvisited: rawParams.preferUnvisited,
  });

  const parsed = recommendConditionsSchema.safeParse(normalized);

  if (!parsed.success) {
    return (
      <main className="flex w-full flex-1 flex-col gap-6">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">오늘 뭐 먹지?</h1>
        <FeedbackState
          tone="error"
          title="추천 조건을 확인해 주세요"
          description={parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다."}
          action={
            <Link href="/recommend" className={buttonStyles({ variant: "secondary" })}>
              조건 없이 다시 시도
            </Link>
          }
        />
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

  const restaurants = await fetchAllRows((from, to) =>
    supabase
      .from("restaurants")
      .select("id, name, category, lat, lng, menu_items(name, price, is_sold_out)")
      .eq("is_active", true)
      .eq("excluded_from_recommend", false)
      .range(from, to)
  );

  const candidates: RecommendCandidate[] = restaurants.map((r) => ({
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
    lat: r.lat,
    lng: r.lng,
  }));

  const hasMenuData = candidates.some((c) => c.menuItems.length > 0);
  const now = new Date();

  const employee = await getCurrentEmployee();
  let recentVisitDays: RecentVisitDaysMap = new Map();
  if (employee) {
    const today = getSeoulDateString(now);
    const sinceDate = getSeoulDateString(new Date(now.getTime() - RECENT_VISIT_WINDOW_DAYS * 24 * 60 * 60 * 1000));

    // 개인 방문(visits)과 약속 참여/방장 확인(appointments) 완료 기록을 합쳐 "가장 최근" 하루만 반영한다.
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

  const withinRadiusBase = filterByRadius(candidates, radius);
  const withinRadiusIds = withinRadiusBase.map((c) => c.id);

  const [
    excludingBusinessStatusMap,
    congestionValueMap,
    reviewAggregates,
    favoriteIds,
    visitedByMeIds,
    globallyVisitedIds,
  ] = await Promise.all([
    getExcludingBusinessStatusMap(withinRadiusIds, now),
    getFreshCongestionValueMap(withinRadiusIds, now),
    getReviewAggregates(withinRadiusIds),
    employee ? getFavoriteRestaurantIds(employee.id) : Promise.resolve(new Set<string>()),
    employee ? getVisitedRestaurantIds(employee.id) : Promise.resolve(new Set<string>()),
    getGloballyVisitedRestaurantIds(),
  ]);

  const withinRadius = withinRadiusBase.map((c) => {
    const aggregate = reviewAggregates.get(c.id);
    const congestionValue = congestionValueMap.get(c.id);
    return {
      ...c,
      excludingBusinessStatus: excludingBusinessStatusMap.get(c.id) ?? null,
      isFreshlyCongested: congestionValue === "혼잡",
      isFreshlyQuiet: congestionValue === "한산",
      isFavorite: favoriteIds.has(c.id),
      hasGoodRatingSignal: hasGoodRatingSignal(aggregate),
      hasFastServiceSignal: hasFastServiceSignal(aggregate),
      topReviewTag: aggregate?.topTag ?? null,
      isUnvisitedByMe: !visitedByMeIds.has(c.id),
      isGloballyUnvisited: !globallyVisitedIds.has(c.id),
    };
  });
  const filtered = filterCandidates(withinRadius, conditions, recentVisitDays);

  const excludedFromCookie = await getExclusionList();
  const activeExclusions = intersectWithCandidates(
    excludedFromCookie,
    filtered.map((c) => c.id)
  );

  const result = pickRecommendation(filtered, { excludeIds: activeExclusions, recentVisitDays, conditions });

  let emptyMessage: string | null = null;
  if (companyLat === null || companyLng === null) {
    emptyMessage = "회사 위치 설정이 없어 추천할 수 없습니다. 관리자에게 문의해주세요.";
  } else if (withinRadius.length === 0) {
    emptyMessage = "설정하신 반경 안에 등록된 식당이 없어요. 반경을 넓혀보세요.";
  } else if (filtered.length === 0 && conditions.excludeRecentVisits) {
    emptyMessage = "최근 방문 제외 조건 때문에 남은 식당이 없어요. 조건을 완화해보세요.";
  } else if (filtered.length === 0) {
    emptyMessage = "조건에 맞는 식당을 찾지 못했어요. 조건을 완화해보세요.";
  } else if (!result.main) {
    emptyMessage = "추천할 식당을 찾지 못했어요.";
  }

  const showResetButton = excludedFromCookie.length > 0;

  const displayedIds = result.main ? [result.main.id, ...result.alternatives.map((a) => a.id)] : [];
  const [reviewCounts, photoUrls] = await Promise.all([
    getReviewCounts(displayedIds),
    getRepresentativeRestaurantPhotoMap(displayedIds),
  ]);
  const filterSummary = [
    conditions.category || "전체 음식",
    radius < 1000 ? `${radius}m` : `${radius / 1000}km`,
    conditions.maxPriceWon ? `${conditions.maxPriceWon.toLocaleString("ko-KR")}원 이하` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="flex w-full flex-1 flex-col gap-6">
      <header>
        <p className="text-sm font-semibold text-brand-dark">빠르고 가볍게 골라드려요</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">오늘 뭐 먹지?</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <ResponsiveFilterPanel summary={filterSummary}>
          <RecommendationFilters
            idPrefix="recommend-filter"
            conditions={conditions}
            radius={radius}
            hasMenuData={hasMenuData}
          />
        </ResponsiveFilterPanel>

        <section className="flex flex-col gap-4 lg:col-start-1 lg:row-span-2 lg:row-start-1" aria-label="추천 결과">
          {emptyMessage ? (
            <FeedbackState
              title="추천 결과가 없어요"
              description={emptyMessage}
              action={
                <Link href="/recommend" className={buttonStyles({ variant: "secondary" })}>
                  조건 초기화
                </Link>
              }
            />
          ) : (
            result.main && (
              <>
                {result.wasExclusionReset && (
                  <p className="rounded-control bg-surface-muted px-4 py-3 text-sm text-ink-muted">
                    오늘 넘긴 식당을 포함해 다시 보여드렸어요. 조건에 맞는 새로운 후보가 더 없어요.
                  </p>
                )}

                {rouletteMode ? (
                  <RouletteResult
                    candidates={filtered.map((candidate) => candidate.name)}
                    restaurantId={result.main.id}
                    restaurantName={result.main.name}
                    decideAction={decideRestaurant.bind(null, result.main.id)}
                    rerollAction={rerollRoulette.bind(null, result.main.id, conditions)}
                  />
                ) : (
                  <>
                <RecommendationCard
                  restaurant={result.main}
                  photoUrl={photoUrls.get(result.main.id) ?? null}
                  reasons={buildRecommendReasons(result.main, conditions, recentVisitDays)}
                  reviewCount={reviewCounts.get(result.main.id) ?? 0}
                  variant="hero"
                  decideAction={decideRestaurant.bind(null, result.main.id)}
                />

                {result.alternatives.length > 0 && (
                  <section className="space-y-3" aria-labelledby="alternative-recommendations-title">
                    <h2 id="alternative-recommendations-title" className="text-base font-bold text-ink">
                      다른 후보
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {result.alternatives.map((alt) => (
                        <RecommendationCard
                          key={alt.id}
                          restaurant={alt}
                          photoUrl={photoUrls.get(alt.id) ?? null}
                          reviewCount={reviewCounts.get(alt.id) ?? 0}
                          variant="alternative"
                          decideAction={decideRestaurant.bind(null, alt.id)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <form action={rerollRecommendation.bind(null, result.main.id, conditions)}>
                    <Button type="submit" variant="secondary" block>
                      다시 추천
                    </Button>
                  </form>

                  <Link
                    href={`${buildRouletteUrl(conditions)}${buildRouletteUrl(conditions).includes("?") ? "&" : "?"}roulette=on`}
                    className={buttonStyles({ variant: "secondary", block: true })}
                  >
                    룰렛 모드
                  </Link>

                  {showResetButton && (
                    <form action={resetExclusions.bind(null, conditions)}>
                      <Button type="submit" variant="ghost" block>
                        제외 목록 초기화
                      </Button>
                    </form>
                  )}
                </div>
                  </>
                )}
              </>
            )
          )}
        </section>

        {result.main ? (
          <aside className="lg:col-start-2 lg:row-start-2" aria-label="추천 식당 위치">
            <RecommendMapView
              points={[result.main, ...result.alternatives].map(
                (r): RecommendMapPoint => ({ id: r.id, name: r.name, lat: r.lat, lng: r.lng })
              )}
              companyLocation={companyLat !== null && companyLng !== null ? { lat: companyLat, lng: companyLng } : null}
            />
          </aside>
        ) : null}
      </div>
    </main>
  );
}
