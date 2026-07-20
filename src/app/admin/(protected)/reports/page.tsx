import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { deleteReportedReview, dismissReport } from "./actions";

export default async function AdminReportsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const supabase = createServiceRoleClient();
  const { data: reports } = await supabase
    .from("reports")
    .select(
      "id, reason, created_at, employees(nickname), reviews(id, one_line_review, restaurants(id, name))"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-12">
      <Link href="/admin" className="text-sm text-neutral-500">
        ← 관리자 홈으로
      </Link>

      <h1 className="text-xl font-bold text-brand-dark">신고 처리</h1>

      {(!reports || reports.length === 0) && <p className="text-sm text-neutral-500">대기 중인 신고가 없어요.</p>}

      <ul className="flex flex-col gap-3">
        {(reports ?? []).map((r) => {
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
            <li key={r.id} className="rounded-2xl border border-neutral-200 px-4 py-3">
              <p className="text-sm text-neutral-500">
                {review.restaurants.name} · 신고자 {reporter?.nickname ?? "(알 수 없음)"}
              </p>
              <p className="mt-1 font-semibold">{review.one_line_review ?? "(한 줄 후기 없음)"}</p>
              <p className="mt-1 text-sm text-neutral-600">사유: {r.reason}</p>
              <div className="mt-2 flex gap-2">
                <form action={dismissReport.bind(null, r.id)} className="flex-1">
                  <button type="submit" className="w-full rounded-xl bg-neutral-100 px-3 py-2 text-sm">
                    기각
                  </button>
                </form>
                <form action={deleteReportedReview.bind(null, r.id, review.id)} className="flex-1">
                  <button type="submit" className="w-full rounded-xl bg-white px-3 py-2 text-sm text-red-600 shadow-sm">
                    리뷰 삭제
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
