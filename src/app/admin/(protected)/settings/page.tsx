import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { updateAnnouncement, updateCompanyCoords, updateInviteCode } from "./actions";
import { getAdminStatusMessage, SETTINGS_STATUS_MESSAGES } from "@/lib/admin/status-messages";

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const { status } = await searchParams;
  const feedbackMessage = getAdminStatusMessage(SETTINGS_STATUS_MESSAGES, status);

  const supabase = createServiceRoleClient();
  const { data: settings, error } = await supabase
    .from("app_settings")
    .select("invite_code, company_lat, company_lng, default_radius_m, announcement")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new Error("설정을 불러오지 못했습니다.");
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-12">
      <Link href="/admin" className="text-sm text-neutral-500">
        ← 관리자 홈으로
      </Link>

      <h1 className="text-xl font-bold text-brand-dark">설정</h1>

      {feedbackMessage && <p className="text-sm text-brand-dark">{feedbackMessage}</p>}

      <section className="flex flex-col gap-2">
        <h2 className="font-bold text-brand-dark">초대코드</h2>
        <form action={updateInviteCode} className="flex flex-col gap-2">
          <input
            type="text"
            name="inviteCode"
            defaultValue={settings?.invite_code ?? ""}
            required
            minLength={4}
            maxLength={64}
            className="rounded-2xl border border-neutral-200 px-4 py-3"
          />
          <button type="submit" className="rounded-2xl bg-brand px-4 py-3 font-semibold text-white">
            저장
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold text-brand-dark">회사 좌표·기본 반경</h2>
        <form action={updateCompanyCoords} className="flex flex-col gap-2">
          <input
            type="number"
            step="0.0000001"
            name="companyLat"
            defaultValue={settings?.company_lat ?? ""}
            placeholder="위도"
            required
            min={-90}
            max={90}
            className="rounded-2xl border border-neutral-200 px-4 py-3"
          />
          <input
            type="number"
            step="0.0000001"
            name="companyLng"
            defaultValue={settings?.company_lng ?? ""}
            placeholder="경도"
            required
            min={-180}
            max={180}
            className="rounded-2xl border border-neutral-200 px-4 py-3"
          />
          <select
            name="defaultRadiusM"
            defaultValue={settings?.default_radius_m ?? 800}
            required
            className="rounded-2xl border border-neutral-200 px-4 py-3"
          >
            <option value={300}>300m</option>
            <option value={500}>500m</option>
            <option value={800}>800m</option>
            <option value={1200}>1.2km</option>
            <option value={2000}>2km</option>
          </select>
          <button type="submit" className="rounded-2xl bg-brand px-4 py-3 font-semibold text-white">
            저장
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold text-brand-dark">공지</h2>
        <form action={updateAnnouncement} className="flex flex-col gap-2">
          <textarea
            name="announcement"
            rows={3}
            maxLength={200}
            defaultValue={settings?.announcement ?? ""}
            placeholder="홈 화면 상단에 표시할 공지(비우면 숨김)"
            className="rounded-2xl border border-neutral-200 px-4 py-3"
          />
          <button type="submit" className="rounded-2xl bg-brand px-4 py-3 font-semibold text-white">
            저장
          </button>
        </form>
      </section>
    </main>
  );
}
