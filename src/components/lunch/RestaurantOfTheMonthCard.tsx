import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { RestaurantOfTheMonth } from "@/lib/restaurant-of-the-month";

const REASON_LABELS = {
  most_completed_visits: "이번 달에 가장 많이 방문했어요.",
  highest_taste_rating: "동률 식당 중 평균 맛 점수가 가장 높아요.",
  latest_completed_visit: "동률 식당 중 가장 최근에 방문했어요.",
  name_tiebreak: "동률 기준으로 선정했어요.",
} as const;

export function RestaurantOfTheMonthCard({
  restaurant,
  compact = false,
}: {
  restaurant: RestaurantOfTheMonth;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <section aria-label="이번 달의 식당">
        <Link
          href={`/restaurants/${restaurant.restaurantId}`}
          className="block rounded-card bg-surface px-4 py-4 shadow-card transition active:scale-[0.99]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xs font-semibold text-brand-dark">이번 달의 식당</h2>
              <p className="mt-1 truncate text-lg font-bold tracking-tight text-ink">{restaurant.restaurantName}</p>
            </div>
            <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-dark">
              Pick
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold text-brand-dark">
            <span className="rounded-full bg-brand-soft px-2.5 py-1">완료 방문 {restaurant.completedVisitCount}회</span>
            {restaurant.averageTasteRating !== null && (
              <span className="rounded-full bg-brand-soft px-2.5 py-1">
                평균 맛 {restaurant.averageTasteRating.toFixed(1)}점
              </span>
            )}
          </div>
        </Link>
      </section>
    );
  }

  return (
    <section aria-label="이번 달의 식당">
      <Card className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-dark">Monthly pick</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-ink">이번 달의 식당</h2>
          </div>
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">이달의 픽</span>
        </div>
        <Link
          href={`/restaurants/${restaurant.restaurantId}`}
          className="rounded-control bg-surface-muted px-4 py-3 transition active:scale-[0.99]"
        >
          <p className="font-semibold text-ink">{restaurant.restaurantName}</p>
          <p className="mt-1 text-sm text-ink-muted">{restaurant.restaurantCategory}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold text-brand-dark">
            <span>완료 방문 {restaurant.completedVisitCount}회</span>
            {restaurant.averageTasteRating !== null && <span>평균 맛 {restaurant.averageTasteRating.toFixed(1)}점</span>}
          </div>
          <p className="mt-2 text-sm text-ink-muted">{REASON_LABELS[restaurant.selectionReason]}</p>
        </Link>
      </Card>
    </section>
  );
}
