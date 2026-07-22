import Link from "next/link";
import type { LunchPassport } from "@/lib/lunch-passport";
import { Card } from "@/components/ui/Card";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" });

export function LunchPassportCard({ passport }: { passport: LunchPassport }) {
  return (
    <section aria-label="점심 여권">
      <Card className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-dark">Lunch passport</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-ink">점심 여권</h2>
          <p className="mt-1 text-sm font-semibold text-brand-dark">{passport.visitedRestaurantCount}/{passport.totalRestaurantCount}곳 방문</p>
        </div>
        {passport.categories.map((category) => (
          <div key={category.category} className="rounded-control bg-surface-muted px-4 py-3">
            <p className="font-semibold text-ink">{category.category} · {category.visitedRestaurantCount}/{category.totalRestaurantCount}곳</p>
            {category.restaurants.length === 0 ? <p className="mt-1 text-sm text-ink-muted">{category.category} · 아직 방문 전</p> : (
              <ul className="mt-2 flex flex-col gap-2">
                {category.restaurants.map((restaurant) => (
                  <li key={restaurant.restaurantId}>
                    <Link href={`/restaurants/${restaurant.restaurantId}`} className="font-semibold text-brand-dark">{restaurant.restaurantName}</Link>
                    <p className="text-sm text-ink-muted">방문 {restaurant.visitCount}회 · 첫 방문 {dateFormatter.format(new Date(`${restaurant.firstVisitedOn}T00:00:00+09:00`))} · 최근 방문 {dateFormatter.format(new Date(`${restaurant.lastVisitedOn}T00:00:00+09:00`))}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </Card>
    </section>
  );
}
