import { notFound } from "next/navigation";
import { AvatarImage } from "@/components/AvatarImage";
import { MonthlyLeaderBadge } from "@/components/MonthlyLeaderBadge";
import { GradientBackdrop, GRADIENT_TEXT } from "@/components/ui/GradientBackdrop";
import { DEFAULT_AVATAR_IMAGE_PATH, getAvatarPreviewUrls } from "@/lib/avatars/queries";
import { getMonthlyLeaderHistory } from "@/lib/monthly-leaders/queries";
import { createServiceRoleClient } from "@/lib/supabase/server";

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceRoleClient();
  const { data: employee } = await supabase
    .from("employees")
    .select("id, nickname")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!employee) {
    notFound();
  }

  const [avatarUrls, monthlyLeaderHistory] = await Promise.all([
    getAvatarPreviewUrls([employee.id]),
    getMonthlyLeaderHistory(employee.id),
  ]);

  return (
    <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 overflow-hidden px-6 py-8">
      <GradientBackdrop />
      <section className="rounded-card bg-surface px-4 py-5 shadow-card">
        <div className="flex items-center gap-3">
          <AvatarImage
            previewUrl={avatarUrls.get(employee.id) ?? DEFAULT_AVATAR_IMAGE_PATH}
            alt={`${employee.nickname}의 아바타`}
            size={56}
          />
          <div>
            <p className="text-sm text-ink-muted">직원 프로필</p>
            <h1 className={`mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl ${GRADIENT_TEXT}`}>
              {employee.nickname}
            </h1>
          </div>
        </div>
        {monthlyLeaderHistory[0] && (
          <div className="mt-4">
            <MonthlyLeaderBadge monthKey={monthlyLeaderHistory[0].monthKey} />
          </div>
        )}
      </section>

      <section className="rounded-card bg-surface px-4 py-4 shadow-card" aria-label="월간 리더 수상 이력">
        <h2 className="text-base font-bold text-ink">월간 리더 수상 이력</h2>
        {monthlyLeaderHistory.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {monthlyLeaderHistory.map((badge) => (
              <li key={badge.monthKey}>
                <MonthlyLeaderBadge monthKey={badge.monthKey} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">아직 월간 리더 수상 이력이 없습니다.</p>
        )}
      </section>
    </main>
  );
}
