import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";

const displayFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminLogsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const supabase = createServiceRoleClient();
  const { data: logs, error } = await supabase
    .from("admin_logs")
    .select("id, action, target_type, target_id, created_at, admins(display_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error("관리자 로그를 불러오지 못했습니다.");
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-12">
      <Link href="/admin" className="text-sm text-ink-muted">
        ← 관리자 홈으로
      </Link>

      <h1 className="text-xl font-bold text-brand-dark">관리자 로그</h1>

      <ul className="flex flex-col gap-2">
        {(logs ?? []).map((log) => {
          const admin = log.admins as unknown as { display_name: string | null } | null;
          return (
            <li key={log.id} className="rounded-card border border-line px-4 py-3 text-sm">
              <p>
                {admin?.display_name ?? "관리자"} · {log.action}
                {log.target_type && ` · ${log.target_type}`}
              </p>
              <p className="text-xs text-ink-muted">{displayFormatter.format(new Date(log.created_at))}</p>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
