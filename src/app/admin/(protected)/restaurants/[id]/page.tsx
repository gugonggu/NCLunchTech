import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { restoreMenuItem, restoreRestaurantHours, setExcludedFromRecommend, setRestaurantActive } from "./actions";
import { getAdminStatusMessage, RESTAURANT_ADMIN_STATUS_MESSAGES } from "@/lib/admin/status-messages";
import { adminUuidSchema } from "@/lib/admin/validation";
import { getRecentStatusReportsForAdmin } from "@/lib/status-reports/queries";
import { formatMinutesAgo } from "@/lib/status-reports/validation";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export default async function AdminRestaurantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const { id } = await params;
  if (!adminUuidSchema.safeParse(id).success) {
    notFound();
  }
  const { status } = await searchParams;
  const feedbackMessage = getAdminStatusMessage(RESTAURANT_ADMIN_STATUS_MESSAGES, status);

  const supabase = createServiceRoleClient();
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id, name, category, address, kakao_place_id, is_active, excluded_from_recommend")
    .eq("id", id)
    .maybeSingle();

  if (restaurantError) {
    throw new Error("식당 정보를 불러오지 못했습니다.");
  }

  if (!restaurant) {
    notFound();
  }

  const [menuResult, hoursResult] = await Promise.all([
    supabase.from("menu_items").select("id, name, price, is_sold_out").eq("restaurant_id", id).order("created_at"),
    supabase.from("restaurant_hours").select("*").eq("restaurant_id", id),
  ]);

  if (menuResult.error || hoursResult.error) {
    throw new Error("식당 관리 데이터를 불러오지 못했습니다.");
  }
  const menuItems = menuResult.data;
  const hoursRows = hoursResult.data;

  const hoursByDay = new Map((hoursRows ?? []).map((h) => [h.day_of_week, h]));
  const recentStatusReports = await getRecentStatusReportsForAdmin(id);
  const now = new Date();

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-12">
      <Link href="/admin/restaurants" className="text-sm text-neutral-500">
        ← 식당 관리로
      </Link>

      {feedbackMessage && <p className="text-sm text-brand-dark">{feedbackMessage}</p>}

      <div>
        <h1 className="text-xl font-bold text-brand-dark">{restaurant.name}</h1>
        <p className="text-neutral-700">
          {restaurant.category} · {restaurant.address}
        </p>
        <p className="text-xs text-neutral-400">kakao_place_id: {restaurant.kakao_place_id}</p>
      </div>

      <div className="flex gap-2">
        <form action={setRestaurantActive.bind(null, id, !restaurant.is_active)} className="flex-1">
          <button type="submit" className="w-full rounded-2xl bg-neutral-100 px-4 py-3 text-sm font-semibold">
            {restaurant.is_active ? "비활성화" : "활성화"}
          </button>
        </form>
        <form
          action={setExcludedFromRecommend.bind(null, id, !restaurant.excluded_from_recommend)}
          className="flex-1"
        >
          <button type="submit" className="w-full rounded-2xl bg-neutral-100 px-4 py-3 text-sm font-semibold">
            {restaurant.excluded_from_recommend ? "추천 제외 해제" : "추천에서 제외"}
          </button>
        </form>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold text-brand-dark">메뉴</h2>
        <ul className="flex flex-col gap-2">
          {(menuItems ?? []).map((item) => (
            <li key={item.id} className="rounded-2xl border border-neutral-200 px-4 py-3">
              <p className="font-semibold">
                {item.name} · {item.price !== null ? `${item.price}원` : "가격 없음"}
                {item.is_sold_out && " · 품절"}
              </p>
              <form action={restoreMenuItem.bind(null, id, item.id)} className="mt-2">
                <button type="submit" className="rounded-xl bg-neutral-100 px-3 py-2 text-sm">
                  직전 값으로 복구
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold text-brand-dark">영업시간</h2>
        <ul className="flex flex-col gap-1 text-sm text-neutral-700">
          {DAY_LABELS.map((label, day) => {
            const row = hoursByDay.get(day);
            return (
              <li key={day}>
                {label}: {row?.is_closed ? "휴무" : row ? `${row.open_time}~${row.close_time}` : "미등록"}
              </li>
            );
          })}
        </ul>
        <form action={restoreRestaurantHours.bind(null, id)}>
          <button type="submit" className="rounded-xl bg-neutral-100 px-3 py-2 text-sm">
            영업시간 직전 값으로 복구
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold text-brand-dark">최근 혼잡·영업 상태 제보</h2>
        {recentStatusReports.length === 0 ? (
          <p className="text-sm text-neutral-500">아직 제보가 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentStatusReports.map((r) => (
              <li key={r.id} className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm">
                <p className="font-semibold">
                  {r.reportType === "congestion" ? "혼잡도" : "영업 상태"} · {r.value}
                </p>
                <p className="text-neutral-500">
                  {r.employeeNickname} · {formatMinutesAgo(new Date(r.createdAt), now)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
