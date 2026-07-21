import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { deleteReportedComment, deleteReportedReview, dismissReport } from "./actions";
import { getAdminStatusMessage, REPORT_STATUS_MESSAGES } from "@/lib/admin/status-messages";
import { getRepeatReporters } from "@/lib/reports/queries";
import { getRestaurantReportCategoryLabel } from "@/lib/reports/validation";

/** 반복 신고자 판정 기준(스펙에 구체적 수치가 없어 임의로 잡음, 필요시 조정). */
const REPEAT_REPORTER_WINDOW_DAYS = 30;
const REPEAT_REPORTER_MIN_COUNT = 3;

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const { status } = await searchParams;
  const feedbackMessage = getAdminStatusMessage(REPORT_STATUS_MESSAGES, status);

  const sinceDate = new Date(new Date().getTime() - REPEAT_REPORTER_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const repeatReporters = await getRepeatReporters(sinceDate, REPEAT_REPORTER_MIN_COUNT);

  const supabase = createServiceRoleClient();
  const [
    { data: reviewReports, error: reviewReportsError },
    { data: commentReports, error: commentReportsError },
    { data: restaurantReports, error: restaurantReportsError },
  ] = await Promise.all([
    supabase
      .from("reports")
      .select("id, reason, created_at, employees(nickname), reviews(id, one_line_review, restaurants(id, name))")
      .eq("status", "pending")
      .not("review_id", "is", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("reports")
      .select(
        "id, reason, created_at, employees(nickname), review_comments(id, content, reviews(restaurants(id, name)))"
      )
      .eq("status", "pending")
      .not("comment_id", "is", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("reports")
      .select("id, reason, category, created_at, employees(nickname), restaurants(id, name)")
      .eq("status", "pending")
      .not("restaurant_id", "is", null)
      .order("created_at", { ascending: false }),
  ]);

  if (reviewReportsError || commentReportsError || restaurantReportsError) {
    throw new Error("신고 목록을 불러오지 못했습니다.");
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-12">
      <Link href="/admin" className="text-sm text-ink-muted">
        ← 관리자 홈으로
      </Link>

      <h1 className="text-xl font-bold text-brand-dark">신고 처리</h1>

      {feedbackMessage && <p className="text-sm text-brand-dark">{feedbackMessage}</p>}

      {repeatReporters.length > 0 && (
        <section className="flex flex-col gap-2 rounded-card bg-surface-muted px-4 py-3">
          <h2 className="text-sm font-bold text-brand-dark">
            반복 신고자(최근 {REPEAT_REPORTER_WINDOW_DAYS}일, {REPEAT_REPORTER_MIN_COUNT}건 이상)
          </h2>
          <ul className="flex flex-col gap-1">
            {repeatReporters.map((r) => (
              <li key={r.employeeId} className="flex items-center justify-between text-sm text-ink">
                <span>{r.employeeNickname}</span>
                <span className="font-semibold">{r.count}건</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-bold text-brand-dark">리뷰 신고</h2>
        {(!reviewReports || reviewReports.length === 0) && (
          <p className="text-sm text-ink-muted">대기 중인 리뷰 신고가 없어요.</p>
        )}
        <ul className="flex flex-col gap-3">
          {(reviewReports ?? []).map((r) => {
            const reporter = r.employees as unknown as { nickname: string } | null;
            const review = r.reviews as unknown as {
              id: string;
              one_line_review: string | null;
              restaurants: { id: string; name: string } | null;
            } | null;

            if (!review || !review.restaurants) {
              return null;
            }

            return (
              <li key={r.id} className="rounded-card border border-line px-4 py-3">
                <p className="text-sm text-ink-muted">
                  {review.restaurants.name} · 신고자 {reporter?.nickname ?? "(알 수 없음)"}
                </p>
                <p className="mt-1 font-semibold">{review.one_line_review ?? "(한 줄 후기 없음)"}</p>
                <p className="mt-1 text-sm text-ink-muted">사유: {r.reason}</p>
                <div className="mt-2 flex gap-2">
                  <form action={dismissReport.bind(null, r.id)} className="flex-1">
                    <button type="submit" className="w-full rounded-control bg-surface-muted px-3 py-2 text-sm">
                      기각
                    </button>
                  </form>
                  <form action={deleteReportedReview.bind(null, r.id)} className="flex-1">
                    <button type="submit" className="w-full rounded-control bg-surface px-3 py-2 text-sm text-red-600 shadow-card">
                      리뷰 삭제
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold text-brand-dark">댓글 신고</h2>
        {(!commentReports || commentReports.length === 0) && (
          <p className="text-sm text-ink-muted">대기 중인 댓글 신고가 없어요.</p>
        )}
        <ul className="flex flex-col gap-3">
          {(commentReports ?? []).map((r) => {
            const reporter = r.employees as unknown as { nickname: string } | null;
            const comment = r.review_comments as unknown as {
              id: string;
              content: string;
              reviews: { restaurants: { id: string; name: string } | null } | null;
            } | null;
            const restaurant = comment?.reviews?.restaurants;

            if (!comment || !restaurant) {
              return null;
            }

            return (
              <li key={r.id} className="rounded-card border border-line px-4 py-3">
                <p className="text-sm text-ink-muted">
                  {restaurant.name} · 신고자 {reporter?.nickname ?? "(알 수 없음)"}
                </p>
                <p className="mt-1 font-semibold">{comment.content}</p>
                <p className="mt-1 text-sm text-ink-muted">사유: {r.reason}</p>
                <div className="mt-2 flex gap-2">
                  <form action={dismissReport.bind(null, r.id)} className="flex-1">
                    <button type="submit" className="w-full rounded-control bg-surface-muted px-3 py-2 text-sm">
                      기각
                    </button>
                  </form>
                  <form action={deleteReportedComment.bind(null, r.id)} className="flex-1">
                    <button type="submit" className="w-full rounded-control bg-surface px-3 py-2 text-sm text-red-600 shadow-card">
                      댓글 삭제
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold text-brand-dark">식당 정보 신고</h2>
        {(!restaurantReports || restaurantReports.length === 0) && (
          <p className="text-sm text-ink-muted">대기 중인 식당 정보 신고가 없어요.</p>
        )}
        <ul className="flex flex-col gap-3">
          {(restaurantReports ?? []).map((r) => {
            const reporter = r.employees as unknown as { nickname: string } | null;
            const restaurant = r.restaurants as unknown as { id: string; name: string } | null;

            if (!restaurant) {
              return null;
            }

            return (
              <li key={r.id} className="rounded-card border border-line px-4 py-3">
                <p className="text-sm text-ink-muted">
                  {restaurant.name} · 신고자 {reporter?.nickname ?? "(알 수 없음)"} ·{" "}
                  {new Date(r.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                </p>
                <p className="mt-1 font-semibold">{getRestaurantReportCategoryLabel(r.category ?? "")}</p>
                {r.reason && <p className="mt-1 text-sm text-ink-muted">메모: {r.reason}</p>}
                <div className="mt-2 flex gap-2">
                  <form action={dismissReport.bind(null, r.id)} className="flex-1">
                    <button type="submit" className="w-full rounded-control bg-surface-muted px-3 py-2 text-sm">
                      확인 완료
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
