import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getMyReview, hasCompletedVisit } from "@/lib/reviews/queries";
import { REVIEW_STATUS_MESSAGES, isReviewStatusCode } from "@/lib/reviews/validation";
import { getCompletedMealSource, getMealRecordForSource } from "@/lib/meals/queries";
import { MEAL_STATUS_MESSAGES, isMealStatusCode, mealSourceSchema } from "@/lib/meals/validation";
import { upsertReview } from "./actions";
import { MealRecordForm } from "./MealRecordForm";

interface NewReviewSearchParams {
  restaurantId?: string;
  status?: string;
  visitId?: string;
  appointmentId?: string;
  mealStatus?: string;
}

const RATING_OPTIONS = [1, 2, 3, 4, 5];

export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: Promise<NewReviewSearchParams>;
}) {
  const { restaurantId, status, visitId, appointmentId, mealStatus } = await searchParams;

  if (!restaurantId) {
    notFound();
  }

  const employee = await getCurrentEmployee();
  if (!employee) {
    const params = new URLSearchParams({ restaurantId });
    if (visitId) params.set("visitId", visitId);
    if (appointmentId) params.set("appointmentId", appointmentId);
    redirect(`/login?returnTo=${encodeURIComponent(`/reviews/new?${params.toString()}`)}`);
  }

  const supabase = createServiceRoleClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, category")
    .eq("id", restaurantId)
    .maybeSingle();

  if (!restaurant) {
    notFound();
  }

  const feedbackMessage = isReviewStatusCode(status) ? REVIEW_STATUS_MESSAGES[status] : null;
  const mealFeedbackMessage = isMealStatusCode(mealStatus) ? MEAL_STATUS_MESSAGES[mealStatus] : null;
  const visited = await hasCompletedVisit(employee.id, restaurantId);

  if (!visited) {
    return (
      <main className="flex flex-1 flex-col gap-4 px-6 py-8">
        <Link href={`/restaurants/${restaurant.id}`} className="text-sm text-neutral-500">
          ← 뒤로
        </Link>
        <h1 className="text-xl font-bold text-brand-dark">리뷰 작성</h1>
        <p className="text-neutral-700">
          {restaurant.name} · {restaurant.category}
        </p>
        <p className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
          방문한 적 있는 식당만 리뷰를 남길 수 있어요.
        </p>
      </main>
    );
  }

  const existing = await getMyReview(employee.id, restaurantId);
  const parsedSource = mealSourceSchema.safeParse({ visitId, appointmentId });
  const completedSource = parsedSource.success
    ? await getCompletedMealSource(employee.id, restaurantId, parsedSource.data)
    : null;
  const mealData = completedSource
    ? await Promise.all([
        supabase
          .from("menu_items")
          .select("id, name, price")
          .eq("restaurant_id", restaurantId)
          .order("created_at"),
        getMealRecordForSource(employee.id, completedSource),
      ])
    : null;
  if (mealData?.[0].error) {
    throw new Error("등록 메뉴 조회에 실패했습니다.");
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-8">
      <Link href={`/restaurants/${restaurant.id}`} className="text-sm text-neutral-500">
        ← 뒤로
      </Link>

      <h1 className="text-xl font-bold text-brand-dark">{existing ? "리뷰 수정" : "리뷰 작성"}</h1>
      <p className="text-neutral-700">
        {restaurant.name} · {restaurant.category}
      </p>

      {feedbackMessage && <p className="text-sm text-red-600">{feedbackMessage}</p>}
      {mealFeedbackMessage && (
        <p className={mealStatus === "saved" ? "text-sm text-green-700" : "text-sm text-red-600"}>
          {mealFeedbackMessage}
        </p>
      )}

      {completedSource && mealData && (
        <MealRecordForm
          restaurantId={restaurantId}
          source={completedSource}
          menuItems={mealData[0].data ?? []}
          existing={mealData[1]}
        />
      )}

      <form action={upsertReview.bind(null, restaurant.id)} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-3">
          <legend className="font-bold text-brand-dark">필수 평가(1~5점)</legend>

          {(
            [
              ["tasteRating", "맛", existing?.tasteRating],
              ["speedRating", "제공 속도", existing?.speedRating],
              ["priceRating", "가격 만족도", existing?.priceRating],
              ["soloFitRating", "혼밥 적합성", existing?.soloFitRating],
            ] as const
          ).map(([name, label, value]) => (
            <label key={name} className="flex items-center justify-between text-sm text-neutral-600">
              {label}
              <select
                name={name}
                defaultValue={value ?? 5}
                required
                className="rounded-xl border border-neutral-200 px-3 py-2 text-base text-neutral-900"
              >
                {RATING_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}점
                  </option>
                ))}
              </select>
            </label>
          ))}

          <label className="flex items-center justify-between text-sm text-neutral-600">
            재방문 의향
            <select
              name="revisitIntent"
              defaultValue={existing?.revisitIntent ?? "again"}
              required
              className="rounded-xl border border-neutral-200 px-3 py-2 text-base text-neutral-900"
            >
              <option value="again">다시 갈래요</option>
              <option value="maybe">고민</option>
              <option value="no">다시 가지 않을래요</option>
            </select>
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="font-bold text-brand-dark">선택 평가(1~5점, 비워두면 제외)</legend>

          {(
            [
              ["portionRating", "양", existing?.portionRating],
              ["crowdednessRating", "혼잡", existing?.crowdednessRating],
              ["groupFitRating", "단체 적합성", existing?.groupFitRating],
              ["cleanlinessRating", "청결", existing?.cleanlinessRating],
            ] as const
          ).map(([name, label, value]) => (
            <label key={name} className="flex items-center justify-between text-sm text-neutral-600">
              {label}
              <select
                name={name}
                defaultValue={value ?? ""}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-base text-neutral-900"
              >
                <option value="">선택 안 함</option>
                {RATING_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}점
                  </option>
                ))}
              </select>
            </label>
          ))}
        </fieldset>

        <label className="flex flex-col gap-1 text-sm text-neutral-600">
          태그(쉼표로 구분, 선택)
          <input
            type="text"
            name="tags"
            defaultValue={existing?.tags?.join(", ") ?? ""}
            placeholder="예: 혼밥, 조용함, 가성비"
            className="rounded-2xl border border-neutral-200 px-4 py-3 text-base text-neutral-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-neutral-600">
          한 줄 후기(선택, 최대 200자)
          <textarea
            name="oneLineReview"
            maxLength={200}
            rows={2}
            defaultValue={existing?.oneLineReview ?? ""}
            className="rounded-2xl border border-neutral-200 px-4 py-3 text-base text-neutral-900"
          />
        </label>

        <button type="submit" className="rounded-2xl bg-brand px-4 py-3 font-semibold text-white">
          {existing ? "리뷰 수정 저장" : "리뷰 저장"}
        </button>
      </form>
    </main>
  );
}
