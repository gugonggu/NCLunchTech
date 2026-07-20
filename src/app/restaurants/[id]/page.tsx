import Link from "next/link";
import { notFound } from "next/navigation";
import { distanceInMeters } from "@/lib/geo";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getCurrentEmployee } from "@/lib/auth/session";
import { getRestaurantReviewSummary, getReportableReviews, hasCompletedVisit } from "@/lib/reviews/queries";
import { isFavorite } from "@/lib/collection/queries";
import { isReportStatusCode, REPORT_STATUS_MESSAGES } from "@/lib/reports/validation";
import { getStatusSummary } from "@/lib/status-reports/queries";
import { BUSINESS_STATUS_VALUES, CONGESTION_VALUES, formatMinutesAgo } from "@/lib/status-reports/validation";
import { decideRestaurant } from "@/app/visits/actions";
import { changeAppointmentRestaurant } from "@/app/appointments/[id]/actions";
import {
  addMenuItem,
  submitStatusReport,
  toggleFavorite,
  toggleMenuSoldOut,
  updateMenuPrice,
  updateRestaurantHours,
} from "./actions";

const RATING_LABELS: { key: "avgTaste" | "avgSpeed" | "avgPrice" | "avgSoloFit"; label: string }[] = [
  { key: "avgTaste", label: "맛" },
  { key: "avgSpeed", label: "제공 속도" },
  { key: "avgPrice", label: "가격 만족도" },
  { key: "avgSoloFit", label: "혼밥 적합성" },
];

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export default async function RestaurantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ forAppointment?: string; reportStatus?: string }>;
}) {
  const { id } = await params;
  const { forAppointment, reportStatus } = await searchParams;
  const supabase = createServiceRoleClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, kakao_place_id, name, category, address, phone, lat, lng")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!restaurant) {
    notFound();
  }

  const [{ data: settings }, { data: menuItems }, { data: hoursRows }] = await Promise.all([
    supabase.from("app_settings").select("company_lat, company_lng").eq("id", 1).maybeSingle(),
    supabase
      .from("menu_items")
      .select("id, name, price, is_sold_out")
      .eq("restaurant_id", id)
      .order("created_at"),
    supabase.from("restaurant_hours").select("*").eq("restaurant_id", id),
  ]);

  const distanceM =
    settings?.company_lat && settings?.company_lng
      ? Math.round(
          distanceInMeters(
            { lat: settings.company_lat, lng: settings.company_lng },
            { lat: restaurant.lat, lng: restaurant.lng }
          )
        )
      : null;

  const kakaoMapUrl = `https://place.map.kakao.com/${restaurant.kakao_place_id}`;

  const hoursByDay = new Map((hoursRows ?? []).map((h) => [h.day_of_week, h]));

  const employee = await getCurrentEmployee();
  const reviewSummary = await getRestaurantReviewSummary(id);
  const reportableReviews = await getReportableReviews(id);
  const canReview = employee ? await hasCompletedVisit(employee.id, id) : false;
  const isFavorited = employee ? await isFavorite(employee.id, id) : false;
  const reportFeedbackMessage = isReportStatusCode(reportStatus) ? REPORT_STATUS_MESSAGES[reportStatus] : null;
  const now = new Date();
  const statusSummary = await getStatusSummary(id, now);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8">
      <Link href="/restaurants" className="text-sm text-neutral-500">
        ← 목록으로
      </Link>

      {reportFeedbackMessage && (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm text-brand-dark shadow-sm">
          {reportFeedbackMessage}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-dark">{restaurant.name}</h1>
          {employee && (
            <form action={toggleFavorite.bind(null, restaurant.id)}>
              <button type="submit" className="text-2xl" aria-label={isFavorited ? "즐겨찾기 해제" : "즐겨찾기 추가"}>
                {isFavorited ? "★" : "☆"}
              </button>
            </form>
          )}
        </div>
        <p className="text-neutral-700">{restaurant.category}</p>
        <p className="text-neutral-700">{restaurant.address}</p>
        {restaurant.phone && <p className="text-neutral-700">{restaurant.phone}</p>}
        {distanceM !== null && <p className="text-neutral-700">KNN타워에서 약 {distanceM}m</p>}
      </div>

      {forAppointment ? (
        <form action={changeAppointmentRestaurant.bind(null, forAppointment, restaurant.id)}>
          <button
            type="submit"
            className="w-full rounded-2xl bg-brand px-4 py-3 text-center font-semibold text-white"
          >
            이 약속의 식당으로 변경
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          <form action={decideRestaurant.bind(null, restaurant.id)}>
            <button
              type="submit"
              className="w-full rounded-2xl bg-brand px-4 py-3 text-center font-semibold text-white"
            >
              혼자 결정하기
            </button>
          </form>
          <Link
            href={`/appointments/new?restaurantId=${restaurant.id}`}
            className="block w-full rounded-2xl bg-white px-4 py-3 text-center font-semibold text-brand-dark shadow-sm"
          >
            동료와 함께
          </Link>
        </div>
      )}

      <a
        href={kakaoMapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-2xl bg-white px-4 py-3 text-center font-semibold text-brand-dark shadow-sm"
      >
        카카오맵에서 보기
      </a>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold text-brand-dark">메뉴</h2>
        <ul className="flex flex-col gap-2">
          {(menuItems ?? []).map((item) => (
            <li key={item.id} className="rounded-2xl border border-neutral-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{item.name}</span>
                {item.is_sold_out && (
                  <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs">품절</span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <form action={updateMenuPrice.bind(null, item.id, id)} className="flex items-center gap-2">
                  <input
                    type="number"
                    name="price"
                    min={0}
                    defaultValue={item.price ?? ""}
                    placeholder="가격 정보 없음"
                    className="w-32 rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                  />
                  <button type="submit" className="rounded-xl bg-neutral-100 px-3 py-2 text-sm">
                    가격 저장
                  </button>
                </form>
                <form action={toggleMenuSoldOut.bind(null, item.id, id, !item.is_sold_out)}>
                  <button type="submit" className="rounded-xl bg-neutral-100 px-3 py-2 text-sm">
                    {item.is_sold_out ? "품절 해제" : "품절 처리"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>

        <form action={addMenuItem.bind(null, id)} className="flex flex-col gap-2">
          <input
            type="text"
            name="name"
            placeholder="메뉴 이름"
            required
            className="rounded-2xl border border-neutral-200 px-4 py-3"
          />
          <input
            type="number"
            name="price"
            min={0}
            placeholder="가격(선택)"
            className="rounded-2xl border border-neutral-200 px-4 py-3"
          />
          <button type="submit" className="rounded-2xl bg-brand px-4 py-3 font-semibold text-white">
            메뉴 추가
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold text-brand-dark">영업시간</h2>
        <form action={updateRestaurantHours.bind(null, id)} className="flex flex-col gap-2">
          {DAY_LABELS.map((label, day) => {
            const row = hoursByDay.get(day);
            return (
              <div
                key={day}
                className="flex items-center gap-2 rounded-2xl border border-neutral-200 px-4 py-3"
              >
                <span className="w-6 font-semibold">{label}</span>
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name={`closed_${day}`} defaultChecked={row?.is_closed ?? false} />
                  휴무
                </label>
                <input
                  type="time"
                  name={`open_${day}`}
                  defaultValue={row?.open_time?.slice(0, 5) ?? ""}
                  className="rounded-xl border border-neutral-200 px-2 py-1 text-sm"
                />
                <span>~</span>
                <input
                  type="time"
                  name={`close_${day}`}
                  defaultValue={row?.close_time?.slice(0, 5) ?? ""}
                  className="rounded-xl border border-neutral-200 px-2 py-1 text-sm"
                />
              </div>
            );
          })}
          <button type="submit" className="rounded-2xl bg-brand px-4 py-3 font-semibold text-white">
            영업시간 저장
          </button>
        </form>
      </section>

      {(reviewSummary || canReview) && (
        <section className="flex flex-col gap-3">
          <h2 className="font-bold text-brand-dark">평가·리뷰</h2>

          {reviewSummary ? (
            <>
              <p className="text-sm text-neutral-500">리뷰 {reviewSummary.count}개</p>
              <ul className="flex flex-col gap-1">
                {RATING_LABELS.map(({ key, label }) => (
                  <li key={key} className="flex items-center justify-between text-sm text-neutral-700">
                    <span>{label}</span>
                    <span>{reviewSummary[key].toFixed(1)}점</span>
                  </li>
                ))}
              </ul>
              {reportableReviews.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {reportableReviews.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm text-neutral-700"
                    >
                      <p>{r.oneLineReview}</p>
                      <div className="mt-1 flex items-center justify-between text-xs text-neutral-400">
                        <span>{r.employeeNickname}</span>
                        {employee && employee.id !== r.employeeId && (
                          <Link href={`/reports/new?reviewId=${r.id}`} className="underline">
                            신고
                          </Link>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-neutral-500">아직 등록된 리뷰가 없어요.</p>
          )}

          {canReview && (
            <Link
              href={`/reviews/new?restaurantId=${id}`}
              className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-brand-dark shadow-sm"
            >
              리뷰 남기기
            </Link>
          )}
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-bold text-brand-dark">지금 상태</h2>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-neutral-600">혼잡도</p>
          {statusSummary.congestion ? (
            <p className="text-sm text-neutral-700">
              {statusSummary.congestion.latestValue} · {formatMinutesAgo(new Date(statusSummary.congestion.latestAt), now)}
              <span className="text-neutral-400">
                {" "}
                (최근 {statusSummary.congestion.freshCount}건, {statusSummary.congestion.distinctReporterCount}명 참여)
              </span>
            </p>
          ) : (
            <p className="text-sm text-neutral-400">정보 없음</p>
          )}
          {employee && (
            <div className="flex gap-2">
              {CONGESTION_VALUES.map((value) => (
                <form key={value} action={submitStatusReport.bind(null, id, "congestion")} className="flex-1">
                  <input type="hidden" name="value" value={value} />
                  <button type="submit" className="w-full rounded-xl bg-neutral-100 px-3 py-2 text-sm font-semibold">
                    {value}
                  </button>
                </form>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-neutral-600">영업 상태</p>
          {statusSummary.businessStatus ? (
            <p className="text-sm text-neutral-700">
              {statusSummary.businessStatus.latestValue} ·{" "}
              {formatMinutesAgo(new Date(statusSummary.businessStatus.latestAt), now)}
              <span className="text-neutral-400">
                {" "}
                (최근 {statusSummary.businessStatus.freshCount}건, {statusSummary.businessStatus.distinctReporterCount}명
                참여)
              </span>
            </p>
          ) : (
            <p className="text-sm text-neutral-400">정보 없음</p>
          )}
          {employee && (
            <div className="grid grid-cols-2 gap-2">
              {BUSINESS_STATUS_VALUES.map((value) => (
                <form key={value} action={submitStatusReport.bind(null, id, "business_status")}>
                  <input type="hidden" name="value" value={value} />
                  <button type="submit" className="w-full rounded-xl bg-neutral-100 px-3 py-2 text-sm font-semibold">
                    {value}
                  </button>
                </form>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-neutral-400">
          제보는 여러 직원의 최근 의견을 참고용으로 모은 것이라, 한 사람의 제보만으로 확정된 사실은 아니에요.
        </p>
      </section>
    </main>
  );
}
