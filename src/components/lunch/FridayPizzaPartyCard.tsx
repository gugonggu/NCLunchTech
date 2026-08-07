import Link from "next/link";
import { FRIDAY_PIZZA_PARTY_PROMO } from "@/lib/friday-pizza-party";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function FridayPizzaPartyCard({ restaurantId }: { restaurantId: string }) {
  return (
    <section aria-label="금요일 피자 파티">
      <Card tone="accent" className="overflow-hidden bg-gradient-to-br from-[#fff0e2] via-[#ffe0c2] to-[#ffcfc2]">
        <p className="text-sm font-semibold text-brand-dark">이번 주 금요일</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">🍕 금요일 피자 파티</h2>
        <p className="mt-2 text-sm text-ink-muted">파파존스 센텀시티점 1+1 · 같이 주문하고 포장해요</p>
        <p className="mt-1 text-sm font-semibold text-brand-dark">대표 주문 후 함께 픽업, 함께 식사</p>
        <Link
          href={`/appointments/new?restaurantId=${restaurantId}&promo=${FRIDAY_PIZZA_PARTY_PROMO}`}
          className={`${buttonStyles()} mt-5 w-full`}
        >
          포장 약속 만들기
        </Link>
      </Card>
    </section>
  );
}
