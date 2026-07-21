import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  isReportStatusCode,
  isRestaurantReportStatusCode,
  REPORT_STATUS_MESSAGES,
  RESTAURANT_REPORT_CATEGORIES,
  RESTAURANT_REPORT_STATUS_MESSAGES,
} from "@/lib/reports/validation";
import { createCommentReport, createReport, createRestaurantReport } from "./actions";

interface NewReportSearchParams {
  reviewId?: string;
  commentId?: string;
  restaurantId?: string;
  status?: string;
}

export default async function NewReportPage({
  searchParams,
}: {
  searchParams: Promise<NewReportSearchParams>;
}) {
  const { reviewId, commentId, restaurantId, status } = await searchParams;

  if (!reviewId && !commentId && !restaurantId) {
    notFound();
  }

  const employee = await getCurrentEmployee();
  const returnParam = reviewId
    ? `reviewId=${reviewId}`
    : commentId
      ? `commentId=${commentId}`
      : `restaurantId=${restaurantId}`;
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/reports/new?${returnParam}`)}`);
  }

  const feedbackMessage = isReportStatusCode(status) ? REPORT_STATUS_MESSAGES[status] : null;
  const supabase = createServiceRoleClient();

  if (restaurantId) {
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, name")
      .eq("id", restaurantId)
      .maybeSingle();

    if (!restaurant) {
      notFound();
    }

    const restaurantFeedbackMessage = isRestaurantReportStatusCode(status)
      ? RESTAURANT_REPORT_STATUS_MESSAGES[status]
      : null;

    return (
      <main className="flex flex-1 flex-col gap-4 px-6 py-8">
        <Link href={`/restaurants/${restaurant.id}`} className="text-sm text-neutral-500">
          ← 뒤로
        </Link>

        <h1 className="text-xl font-bold text-brand-dark">식당 정보 제보</h1>
        <p className="text-neutral-700">{restaurant.name}</p>

        {restaurantFeedbackMessage && <p className="text-sm text-brand-dark">{restaurantFeedbackMessage}</p>}

        <form action={createRestaurantReport.bind(null, restaurantId)} className="flex flex-col gap-3">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm text-neutral-600">무엇이 달라졌나요?</legend>
            {RESTAURANT_REPORT_CATEGORIES.map((c) => (
              <label
                key={c.value}
                className="flex items-center gap-2 rounded-2xl border border-neutral-200 px-4 py-3"
              >
                <input type="radio" name="category" value={c.value} required />
                {c.label}
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-1 text-sm text-neutral-600">
            추가 메모(선택, 최대 200자)
            <textarea
              name="note"
              maxLength={200}
              rows={3}
              placeholder="예: 3층으로 이전한 것 같아요"
              className="rounded-2xl border border-neutral-200 px-4 py-3 text-base text-neutral-900"
            />
          </label>
          <button type="submit" className="rounded-2xl bg-brand px-4 py-3 font-semibold text-white">
            제보하기
          </button>
        </form>
      </main>
    );
  }

  if (commentId) {
    const { data: comment } = await supabase
      .from("review_comments")
      .select("id, employee_id, content, reviews(restaurant_id, restaurants(id, name))")
      .eq("id", commentId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!comment) {
      notFound();
    }

    const review = comment.reviews as unknown as {
      restaurant_id: string;
      restaurants: { id: string; name: string } | null;
    } | null;
    const restaurant = review?.restaurants;
    if (!restaurant) {
      notFound();
    }

    if (comment.employee_id === employee.id) {
      return (
        <main className="flex flex-1 flex-col gap-4 px-6 py-8">
          <Link href={`/restaurants/${restaurant.id}`} className="text-sm text-neutral-500">
            ← 뒤로
          </Link>
          <h1 className="text-xl font-bold text-brand-dark">댓글 신고</h1>
          <p className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
            본인이 작성한 댓글은 신고할 수 없어요.
          </p>
        </main>
      );
    }

    return (
      <main className="flex flex-1 flex-col gap-4 px-6 py-8">
        <Link href={`/restaurants/${restaurant.id}`} className="text-sm text-neutral-500">
          ← 뒤로
        </Link>

        <h1 className="text-xl font-bold text-brand-dark">댓글 신고</h1>
        <p className="text-neutral-700">{restaurant.name}</p>

        {feedbackMessage && <p className="text-sm text-red-600">{feedbackMessage}</p>}

        <p className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm text-neutral-700">{comment.content}</p>

        <form action={createCommentReport.bind(null, commentId)} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-neutral-600">
            신고 사유(최대 200자)
            <textarea
              name="reason"
              maxLength={200}
              rows={3}
              required
              placeholder="예: 허위 정보로 보여요"
              className="rounded-2xl border border-neutral-200 px-4 py-3 text-base text-neutral-900"
            />
          </label>
          <button type="submit" className="rounded-2xl bg-brand px-4 py-3 font-semibold text-white">
            신고하기
          </button>
        </form>
      </main>
    );
  }

  const { data: review } = await supabase
    .from("reviews")
    .select("id, employee_id, one_line_review, restaurants(id, name)")
    .eq("id", reviewId)
    .maybeSingle();

  if (!review) {
    notFound();
  }

  const restaurant = review.restaurants as unknown as { id: string; name: string } | null;
  if (!restaurant) {
    notFound();
  }

  if (review.employee_id === employee.id) {
    return (
      <main className="flex flex-1 flex-col gap-4 px-6 py-8">
        <Link href={`/restaurants/${restaurant.id}`} className="text-sm text-neutral-500">
          ← 뒤로
        </Link>
        <h1 className="text-xl font-bold text-brand-dark">리뷰 신고</h1>
        <p className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
          본인이 작성한 리뷰는 신고할 수 없어요.
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-8">
      <Link href={`/restaurants/${restaurant.id}`} className="text-sm text-neutral-500">
        ← 뒤로
      </Link>

      <h1 className="text-xl font-bold text-brand-dark">리뷰 신고</h1>
      <p className="text-neutral-700">{restaurant.name}</p>

      {feedbackMessage && <p className="text-sm text-red-600">{feedbackMessage}</p>}

      {review.one_line_review && (
        <p className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm text-neutral-700">
          {review.one_line_review}
        </p>
      )}

      <form action={createReport.bind(null, reviewId as string)} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-neutral-600">
          신고 사유(최대 200자)
          <textarea
            name="reason"
            maxLength={200}
            rows={3}
            required
            placeholder="예: 허위 정보로 보여요"
            className="rounded-2xl border border-neutral-200 px-4 py-3 text-base text-neutral-900"
          />
        </label>
        <button type="submit" className="rounded-2xl bg-brand px-4 py-3 font-semibold text-white">
          신고하기
        </button>
      </form>
    </main>
  );
}
