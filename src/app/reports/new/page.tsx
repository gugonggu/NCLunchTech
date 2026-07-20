import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isReportStatusCode, REPORT_STATUS_MESSAGES } from "@/lib/reports/validation";
import { createReport } from "./actions";

interface NewReportSearchParams {
  reviewId?: string;
  status?: string;
}

export default async function NewReportPage({
  searchParams,
}: {
  searchParams: Promise<NewReportSearchParams>;
}) {
  const { reviewId, status } = await searchParams;

  if (!reviewId) {
    notFound();
  }

  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/reports/new?reviewId=${reviewId}`)}`);
  }

  const supabase = createServiceRoleClient();
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

  const feedbackMessage = isReportStatusCode(status) ? REPORT_STATUS_MESSAGES[status] : null;

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

      <form action={createReport.bind(null, reviewId)} className="flex flex-col gap-3">
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
