import Link from "next/link";
import type { RestaurantOfTheMonth } from "@/lib/restaurant-of-the-month";
import { Card } from "@/components/ui/Card";

const REASON_LABELS = {
  most_completed_visits: "이번 달에 가장 많이 방문했어요",
  highest_taste_rating: "동률 식당 중 평균 맛 점수가 가장 높아요",
  latest_completed_visit: "동률 식당 중 가장 최근에 방문했어요",
  name_tiebreak: "동률 기준으로 선정되었어요",
} as const;

export function RestaurantOfTheMonthCard({
  restaurant,
  compact = false,
}: {
  restaurant: RestaurantOfTheMonth;
  compact?: boolean;
}) {
  return (
    <section aria-label="이번 달의 식당">
      <Card className={compact ? "p-4" : "flex flex-col gap-3"}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-dark">Monthly pick</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-ink">이번 달의 식당</h2>
          </div>
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">이달의 픽</span>
        </div>
        <Link href={`/restaurants/${restaurant.restaurantId}`} className="rounded-control bg-surface-muted px-4 py-3 transition active:scale-[0.99]">
          <p className="font-semibold text-ink">{restaurant.restaurantName}</p>
          {!compact && <p className="mt-1 text-sm text-ink-muted">{restaurant.restaurantCategory}</p>}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold text-brand-dark">
            <span>완료 방문 {restaurant.completedVisitCount}회</span>
            {restaurant.averageTasteRating !== null && <span>평균 맛 {restaurant.averageTasteRating.toFixed(1)}점</span>}
          </div>
          {!compact && <p className="mt-2 text-sm text-ink-muted">{REASON_LABELS[restaurant.selectionReason]}</p>}
        </Link>
      </Card>
    </section>
  );
}
