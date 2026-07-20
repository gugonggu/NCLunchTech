import Link from "next/link";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { LogoutButton } from "./LogoutButton";

export default async function AdminDashboardPage() {
  const admin = await getCurrentAdmin();

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-12">
      <h1 className="text-xl font-bold text-brand-dark">관리자</h1>
      <p className="text-neutral-700">{admin?.email} 님으로 로그인되어 있습니다.</p>

      <div className="flex flex-col gap-2">
        <Link href="/admin/restaurants" className="rounded-2xl bg-white px-4 py-3 font-semibold text-brand-dark shadow-sm">
          식당 관리
        </Link>
        <Link href="/admin/employees" className="rounded-2xl bg-white px-4 py-3 font-semibold text-brand-dark shadow-sm">
          직원 관리
        </Link>
        <Link href="/admin/reports" className="rounded-2xl bg-white px-4 py-3 font-semibold text-brand-dark shadow-sm">
          신고 처리
        </Link>
        <Link href="/admin/settings" className="rounded-2xl bg-white px-4 py-3 font-semibold text-brand-dark shadow-sm">
          설정
        </Link>
        <Link href="/admin/logs" className="rounded-2xl bg-white px-4 py-3 font-semibold text-brand-dark shadow-sm">
          관리자 로그
        </Link>
      </div>

      <LogoutButton />
    </main>
  );
}
