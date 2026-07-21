import Link from "next/link";
import type { RecommendCandidate } from "@/lib/recommend/engine";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RestaurantVisual } from "./RestaurantVisual";

interface RecommendationCardProps {
  restaurant: RecommendCandidate;
  photoUrl: string | null;
  reasons?: string[];
  reviewCount: number;
  variant: "hero" | "alternative";
  decideAction: () => void | Promise<void>;
}

export function RecommendationCard({
  restaurant,
  photoUrl,
  reasons = [],
  reviewCount,
  variant,
  decideAction,
}: RecommendationCardProps) {
  const isHero = variant === "hero";
  const firstMenu = restaurant.menuItems[0];

  return (
    <Card
      padding="none"
      tone={isHero ? "accent" : "surface"}
      className="overflow-hidden"
      role="article"
      aria-label={`${restaurant.name} 추천`}
    >
      <RestaurantVisual
        name={restaurant.name}
        category={restaurant.category}
        photoUrl={photoUrl}
        priority={isHero}
      />

      <div className={isHero ? "p-5" : "p-4"}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{restaurant.category}</Badge>
          {reviewCount > 0 && <Badge tone="info">리뷰 {reviewCount}개</Badge>}
        </div>

        <h2 className={isHero ? "mt-3 text-2xl font-bold text-ink" : "mt-3 text-lg font-bold text-ink"}>
          {restaurant.name}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          회사에서 약 {restaurant.distanceM}m
          {firstMenu && (
            <>
              {` · ${firstMenu.name}`}
              {firstMenu.price !== null &&
                ` ${firstMenu.price.toLocaleString("ko-KR")}원`}
            </>
          )}
        </p>

        {reasons.length > 0 && (
          <div className="mt-3 flex flex-col gap-1">
            {reasons.map((reason) => (
              <p key={reason} className="text-sm font-medium text-brand-dark">
                {reason}
              </p>
            ))}
          </div>
        )}

        {isHero ? (
          <div className="mt-5 flex flex-col gap-2">
            <form action={decideAction}>
              <Button type="submit" block>
                여기로 결정
              </Button>
            </form>
            <Link
              href={`/appointments/new?restaurantId=${restaurant.id}`}
              className={buttonStyles({ variant: "secondary", block: true })}
            >
              동료와 함께
            </Link>
            <Link
              href={`/restaurants/${restaurant.id}`}
              className={buttonStyles({ variant: "ghost", block: true })}
            >
              상세 보기
            </Link>
          </div>
        ) : (
          <Link
            href={`/restaurants/${restaurant.id}`}
            className={`${buttonStyles({ variant: "ghost", size: "compact", block: true })} mt-4`}
          >
            상세 보기
          </Link>
        )}
      </div>
    </Card>
  );
}
