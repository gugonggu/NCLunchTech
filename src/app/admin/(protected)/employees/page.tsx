import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { resetEmployeePin, setEmployeeActive } from "./actions";
import { EMPLOYEE_STATUS_MESSAGES, getAdminStatusMessage } from "@/lib/admin/status-messages";

export default async function AdminEmployeesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const { status } = await searchParams;
  const feedbackMessage = getAdminStatusMessage(EMPLOYEE_STATUS_MESSAGES, status);

  const supabase = createServiceRoleClient();
  const employees = await fetchAllRows((from, to) =>
    supabase
      .from("employees")
      .select("id, nickname, is_active, locked_until, created_at")
      .order("created_at", { ascending: false })
      .range(from, to)
  );

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-12">
      <Link href="/admin" className="text-sm text-neutral-500">
        ← 관리자 홈으로
      </Link>

      <h1 className="text-xl font-bold text-brand-dark">직원 관리</h1>

      {feedbackMessage && <p className="text-sm text-brand-dark">{feedbackMessage}</p>}

      <ul className="flex flex-col gap-3">
        {employees.map((e) => (
          <li key={e.id} className="rounded-2xl border border-neutral-200 px-4 py-3">
            <p className="font-semibold">
              {e.nickname}
              {!e.is_active && <span className="ml-2 text-xs text-red-600">비활성화됨</span>}
              {e.locked_until && new Date(e.locked_until) > new Date() && (
                <span className="ml-2 text-xs text-neutral-500">로그인 잠김</span>
              )}
            </p>

            <form action={resetEmployeePin.bind(null, e.id)} className="mt-2 flex items-center gap-2">
              <input
                type="text"
                name="newPin"
                inputMode="numeric"
                maxLength={4}
                pattern="[0-9]{4}"
                placeholder="새 PIN 4자리"
                required
                className="w-24 rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded-xl bg-neutral-100 px-3 py-2 text-sm">
                PIN 초기화
              </button>
            </form>

            <form action={setEmployeeActive.bind(null, e.id, !e.is_active)} className="mt-2">
              <button type="submit" className="rounded-xl bg-neutral-100 px-3 py-2 text-sm">
                {e.is_active ? "비활성화" : "재활성화"}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
