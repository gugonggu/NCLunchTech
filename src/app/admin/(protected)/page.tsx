import { getCurrentAdmin } from "@/lib/auth/admin";
import { LogoutButton } from "./LogoutButton";

export default async function AdminDashboardPage() {
  const admin = await getCurrentAdmin();

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-12">
      <h1 className="text-xl font-bold text-brand-dark">관리자</h1>
      <p className="text-neutral-700">{admin?.email} 님으로 로그인되어 있습니다.</p>
      <LogoutButton />
    </main>
  );
}
