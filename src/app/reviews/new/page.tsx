import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getMyReview, hasCompletedVisit } from "@/lib/reviews/queries";
import { REVIEW_STATUS_MESSAGES, REVIEW_TAGS, isReviewStatusCode } from "@/lib/reviews/validation";
import { getCompletedMealSource, getMealRecordForSource } from "@/lib/meals/queries";
import { MEAL_STATUS_MESSAGES, isMealStatusCode, mealSourceSchema } from "@/lib/meals/validation";
import { getReviewPhotos } from "@/lib/review-photos/queries";
import { MAX_PHOTOS_PER_REVIEW, REVIEW_PHOTO_MESSAGES, isReviewPhotoStatusCode } from "@/lib/review-photos/validation";
import { buttonStyles } from "@/components/ui/Button";
import { GradientBackdrop, GRADIENT_TEXT } from "@/components/ui/GradientBackdrop";
import { deleteReviewPhoto, uploadReviewPhoto, upsertReview } from "./actions";
import { MealRecordForm } from "./MealRecordForm";

interface NewReviewSearchParams {
  restaurantId?: string;
  status?: string;
  visitId?: string;
  appointmentId?: string;
  mealStatus?: string;
  photoStatus?: string;
}

const RATING_OPTIONS = [1, 2, 3, 4, 5];

export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: Promise<NewReviewSearchParams>;
}) {
  const { restaurantId, status, visitId, appointmentId, mealStatus, photoStatus } = await searchParams;

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
  const photoFeedbackMessage = isReviewPhotoStatusCode(photoStatus) ? REVIEW_PHOTO_MESSAGES[photoStatus] : null;
  const visited = await hasCompletedVisit(employee.id, restaurantId);

  if (!visited) {
    return (
      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 overflow-hidden px-6 py-8">
        <GradientBackdrop />
        <Link href={`/restaurants/${restaurant.id}`} className="text-sm text-ink-muted">
          ← 뒤로
        </Link>
        <h1 className={`text-2xl font-extrabold tracking-tight sm:text-3xl ${GRADIENT_TEXT}`}>리뷰 작성</h1>
        <p className="text-ink">
          {restaurant.name} · {restaurant.category}
        </p>
        <p className="rounded-card bg-surface-muted px-4 py-3 text-sm text-ink-muted">
          방문한 적 있는 식당만 리뷰를 남길 수 있어요.
        </p>
      </main>
    );
  }

  const existing = await getMyReview(employee.id, restaurantId);
  const photos = existing ? await getReviewPhotos(existing.id) : [];
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
    <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 overflow-hidden px-6 py-8">
      <GradientBackdrop />
      <Link href={`/restaurants/${restaurant.id}`} className="text-sm text-ink-muted">
        ← 뒤로
      </Link>

      <h1 className={`text-2xl font-extrabold tracking-tight sm:text-3xl ${GRADIENT_TEXT}`}>
        {existing ? "리뷰 수정" : "리뷰 작성"}
      </h1>
      <p className="text-ink">
        {restaurant.name} · {restaurant.category}
      </p>

      {feedbackMessage && <p className="text-sm text-danger">{feedbackMessage}</p>}
      {mealFeedbackMessage && (
        <p className={mealStatus === "saved" ? "text-sm text-success" : "text-sm text-danger"}>
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
          <legend className="text-lg font-bold tracking-tight text-brand-dark">필수 평가(1~5점)</legend>

          {(
            [
              ["tasteRating", "맛", existing?.tasteRating],
              ["speedRating", "제공 속도", existing?.speedRating],
              ["priceRating", "가격 만족도", existing?.priceRating],
              ["soloFitRating", "혼밥 적합성", existing?.soloFitRating],
            ] as const
          ).map(([name, label, value]) => (
            <label key={name} className="flex items-center justify-between text-sm text-ink-muted">
              {label}
              <select
                name={name}
                defaultValue={value ?? 5}
                required
                className="rounded-xl border border-line px-3 py-2 text-base text-ink"
              >
                {RATING_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}점
                  </option>
                ))}
              </select>
            </label>
          ))}

          <label className="flex items-center justify-between text-sm text-ink-muted">
            재방문 의향
            <select
              name="revisitIntent"
              defaultValue={existing?.revisitIntent ?? "again"}
              required
              className="rounded-xl border border-line px-3 py-2 text-base text-ink"
            >
              <option value="again">다시 갈래요</option>
              <option value="maybe">고민</option>
              <option value="no">다시 가지 않을래요</option>
            </select>
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-lg font-bold tracking-tight text-brand-dark">선택 평가(1~5점, 비워두면 제외)</legend>

          {(
            [
              ["portionRating", "양", existing?.portionRating],
              ["crowdednessRating", "혼잡", existing?.crowdednessRating],
              ["groupFitRating", "단체 적합성", existing?.groupFitRating],
              ["cleanlinessRating", "청결", existing?.cleanlinessRating],
            ] as const
          ).map(([name, label, value]) => (
            <label key={name} className="flex items-center justify-between text-sm text-ink-muted">
              {label}
              <select
                name={name}
                defaultValue={value ?? ""}
                className="rounded-xl border border-line px-3 py-2 text-base text-ink"
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

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm text-ink-muted">태그(선택, 여러 개 가능)</legend>
          {REVIEW_TAGS.map((tag) => (
            <label key={tag} className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="tags" value={tag} defaultChecked={existing?.tags?.includes(tag) ?? false} />
              {tag}
            </label>
          ))}
        </fieldset>

        <label className="flex flex-col gap-1 text-sm text-ink-muted">
          한 줄 후기(선택, 최대 200자)
          <textarea
            name="oneLineReview"
            maxLength={200}
            rows={2}
            defaultValue={existing?.oneLineReview ?? ""}
            className="rounded-control border border-line px-4 py-3 text-base text-ink"
          />
        </label>

        <button type="submit" className={buttonStyles({ block: true })}>
          {existing ? "리뷰 수정 저장" : "리뷰 저장"}
        </button>
      </form>

      {existing && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold tracking-tight text-brand-dark">
            사진(선택, 최대 {MAX_PHOTOS_PER_REVIEW}장)
          </h2>

          {photoFeedbackMessage && <p className="text-sm text-danger">{photoFeedbackMessage}</p>}

          {photos.length > 0 && (
            <ul className="grid grid-cols-3 gap-2">
              {photos.map((p) => (
                <li key={p.id} className="flex flex-col gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="내가 올린 리뷰 사진" className="aspect-square w-full rounded-xl object-cover" />
                  <form action={deleteReviewPhoto.bind(null, p.id, restaurantId)}>
                    <button type="submit" className="w-full rounded-lg bg-surface-muted px-2 py-1 text-xs transition active:scale-[0.98]">
                      삭제
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {photos.length < MAX_PHOTOS_PER_REVIEW && (
            <form action={uploadReviewPhoto.bind(null, restaurantId)} className="flex flex-col gap-2">
              <input
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp"
                required
                className="text-sm text-ink-muted"
              />
              <button type="submit" className="rounded-control bg-surface-muted px-4 py-3 text-sm font-semibold transition active:scale-[0.98]">
                사진 추가
              </button>
            </form>
          )}
        </section>
      )}
    </main>
  );
}
