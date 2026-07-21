import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { getPollsForAdmin } from "@/lib/polls/queries";

const STATUS_LABELS: Record<string, string> = {
  open: "진행 중",
  closed: "마감됨",
  decided: "결정됨",
};

export default async function AdminPollsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const polls = await getPollsForAdmin();

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-12">
      <Link href="/admin" className="text-sm text-ink-muted">
        ← 관리자 홈으로
      </Link>

      <h1 className="text-xl font-bold text-brand-dark">투표 상태 확인</h1>
      <p className="text-sm text-ink-muted">최근 생성된 투표 최대 50개(읽기 전용).</p>

      {polls.length === 0 ? (
        <p className="text-sm text-ink-muted">아직 생성된 투표가 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {polls.map((p) => (
            <li key={p.id} className="rounded-card border border-line px-4 py-3 text-sm">
              <p className="font-semibold">
                {p.pollType === "restaurant" ? "식당 투표" : "메뉴 투표"}
                {p.restaurantName && ` · ${p.restaurantName}`}
              </p>
              <p className="text-ink-muted">
                {STATUS_LABELS[p.status] ?? p.status} · {p.totalVotes}표 · 생성자 {p.creatorNickname}
                {p.isAppointmentLinked ? " · 약속 연결" : " · 독립 투표"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
