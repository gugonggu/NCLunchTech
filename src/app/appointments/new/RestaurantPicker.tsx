import Link from "next/link";
import { FeedbackState } from "@/components/ui/FeedbackState";
import {
  type AppointmentRestaurantSearchState,
  type NormalizedAppointmentRestaurantSearch,
} from "@/lib/appointments/restaurant-search";
import { DEFAULT_RADIUS_M, RADIUS_OPTIONS_M, RESTAURANT_CATEGORIES } from "@/lib/restaurants/constants";

const SORT_OPTIONS = [
  ["distance", "거리순"],
  ["name", "이름순"],
  ["new", "최신순"],
] as const;

function searchHref(filters: NormalizedAppointmentRestaurantSearch, page?: number) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.radius !== DEFAULT_RADIUS_M) params.set("radius", String(filters.radius));
  if (filters.openNow) params.set("openNow", "on");
  if (filters.sort !== "distance") params.set("sort", filters.sort);
  if (page) params.set("page", String(page));

  const query = params.toString();
  return query ? `/appointments/new?${query}` : "/appointments/new";
}

function Pagination({ state }: { state: Extract<AppointmentRestaurantSearchState, { status: "ready" }> }) {
  const previousHref = state.page > 1 ? searchHref(state.filters, state.page - 1) : null;
  const nextHref = state.page < state.totalPages ? searchHref(state.filters, state.page + 1) : null;

  return (
    <nav aria-label="검색 결과 페이지" className="flex items-center justify-between gap-3">
      {previousHref ? (
        <Link href={previousHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-dark underline">
          이전
        </Link>
      ) : (
        <span aria-disabled="true" className="inline-flex min-h-11 items-center text-sm text-ink-muted">
          이전
        </span>
      )}
      <p className="text-sm text-ink-muted">
        총 {state.totalCount}개 · {state.page}/{state.totalPages}페이지
      </p>
      {nextHref ? (
        <Link href={nextHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-dark underline">
          다음
        </Link>
      ) : (
        <span aria-disabled="true" className="inline-flex min-h-11 items-center text-sm text-ink-muted">
          다음
        </span>
      )}
    </nav>
  );
}

function SearchForm({ filters }: { filters: NormalizedAppointmentRestaurantSearch }) {
  return (
    <form method="get" className="grid gap-3 rounded-card border border-line bg-surface p-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm text-ink sm:col-span-2">
        식당 이름
        <input
          type="text"
          name="q"
          defaultValue={filters.q}
          className="min-h-11 rounded-control border border-line px-3 text-base text-ink"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink">
        음식 분류
        <select name="category" defaultValue={filters.category} className="min-h-11 rounded-control border border-line px-3 text-base text-ink">
          <option value="">전체</option>
          {RESTAURANT_CATEGORIES.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink">
        거리
        <select name="radius" defaultValue={String(filters.radius)} className="min-h-11 rounded-control border border-line px-3 text-base text-ink">
          {RADIUS_OPTIONS_M.map((radius) => (
            <option key={radius} value={radius}>{radius}m</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink">
        정렬
        <select name="sort" defaultValue={filters.sort} className="min-h-11 rounded-control border border-line px-3 text-base text-ink">
          {SORT_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <div className="flex items-end justify-between gap-3">
        <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="openNow" value="on" defaultChecked={filters.openNow} />
          영업 중만
        </label>
        <button type="submit" className="min-h-11 rounded-control bg-brand px-4 text-sm font-semibold text-black">
          검색
        </button>
      </div>
    </form>
  );
}

export function RestaurantPicker({ state }: { state: AppointmentRestaurantSearchState }) {
  return (
    <section className="flex flex-col gap-4" aria-label="식당 선택">
      <SearchForm filters={state.filters} />

      {state.status === "ready" ? (
        <>
          <Pagination state={state} />
          <div className="flex flex-col gap-3">
            {state.items.map((restaurant) => (
              <Link
                key={restaurant.id}
                href={`/appointments/new?restaurantId=${restaurant.id}`}
                className="flex min-h-11 flex-col gap-1 rounded-card border border-line bg-surface p-4 text-ink hover:bg-surface-muted"
              >
                <span className="font-semibold">{restaurant.name}</span>
                <span className="text-sm text-ink-muted">{restaurant.category} · {restaurant.address}</span>
                <span className="text-sm text-ink-muted">
                  {Math.round(restaurant.distanceM)}m · {restaurant.isOpenNow ? "영업 중" : "영업 종료"}
                </span>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      {state.status === "empty" ? (
        <FeedbackState
          title="조건에 맞는 식당이 없어요"
          description="검색 조건을 바꾸거나 초기화해 보세요."
          action={<Link href="/appointments/new">조건 초기화</Link>}
        />
      ) : null}
      {state.status === "location-missing" ? (
        <FeedbackState
          tone="error"
          title="회사 위치 정보가 없어요"
          description="관리자에게 회사 위치 설정을 요청해 주세요."
          action={<Link href="/appointments/new">다시 시도</Link>}
        />
      ) : null}
      {state.status === "error" ? (
        <FeedbackState
          tone="error"
          title="식당을 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={<Link href="/appointments/new">다시 시도</Link>}
        />
      ) : null}
    </section>
  );
}
