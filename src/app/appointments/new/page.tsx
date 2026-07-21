import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  APPOINTMENT_STATUS_MESSAGES,
  formatSeoulDateTimeLocal,
  getDefaultAppointmentTime,
  isAppointmentStatusCode,
} from "@/lib/appointments/validation";
import { createAppointment } from "./actions";

interface NewAppointmentSearchParams {
  restaurantId?: string;
  status?: string;
  fromPollId?: string;
}

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<NewAppointmentSearchParams>;
}) {
  const { restaurantId, status, fromPollId } = await searchParams;

  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(
      restaurantId
        ? `/login?returnTo=${encodeURIComponent(`/appointments/new?restaurantId=${restaurantId}`)}`
        : "/login?returnTo=%2Fappointments%2Fnew",
    );
  }

  const supabase = createServiceRoleClient();

  if (!restaurantId) {
    const { data: restaurants } = await supabase
      .from("restaurants")
      .select("id, name, category")
      .eq("is_active", true)
      .order("name", { ascending: true });

    return (
      <main className="flex flex-1 flex-col gap-4 px-6 py-8">
        <h1 className="text-xl font-bold text-brand-dark">함께 먹기</h1>

        {restaurants?.length ? (
          <div className="flex flex-col gap-3">
            {restaurants.map((restaurant) => (
              <Card key={restaurant.id} padding="none" className="overflow-hidden">
                <Link
                  href={`/appointments/new?restaurantId=${restaurant.id}`}
                  className={buttonStyles({ variant: "secondary", block: true })}
                >
                  <span>{restaurant.name}</span>
                  <Badge>{restaurant.category}</Badge>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <FeedbackState
            title="선택할 수 있는 식당이 없어요"
            description="식당 목록을 확인하거나 관리자에게 활성 식당 등록을 요청해 주세요."
            action={<Link href="/restaurants">식당 둘러보기</Link>}
          />
        )}
      </main>
    );
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, category")
    .eq("id", restaurantId)
    .eq("is_active", true)
    .maybeSingle();

  if (!restaurant) {
    notFound();
  }

  const feedbackMessage = isAppointmentStatusCode(status) ? APPOINTMENT_STATUS_MESSAGES[status] : null;
  const defaultScheduledAt = formatSeoulDateTimeLocal(getDefaultAppointmentTime(new Date()));

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-8">
      <Link href={`/restaurants/${restaurant.id}`} className="text-sm text-neutral-500">
        ← 뒤로
      </Link>

      <h1 className="text-xl font-bold text-brand-dark">동료와 함께</h1>
      <p className="text-neutral-700">
        {restaurant.name} · {restaurant.category}
      </p>

      {feedbackMessage && <p className="text-sm text-red-600">{feedbackMessage}</p>}
      {fromPollId && (
        <p className="rounded-2xl bg-brand-bg px-4 py-3 text-sm text-brand-dark">
          투표로 정해진 식당이에요.
        </p>
      )}

      <form action={createAppointment.bind(null, restaurant.id)} className="flex flex-col gap-3">
        {fromPollId && <input type="hidden" name="fromPollId" value={fromPollId} />}
        <label className="flex flex-col gap-1 text-sm text-neutral-600">
          약속 시각
          <input
            type="datetime-local"
            name="scheduledAt"
            defaultValue={defaultScheduledAt}
            required
            className="rounded-2xl border border-neutral-200 px-4 py-3 text-base text-neutral-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-neutral-600">
          메모(선택, 최대 100자)
          <textarea
            name="memo"
            maxLength={100}
            rows={2}
            placeholder="예: 회의실 앞에서 12시 반에 모여요"
            className="rounded-2xl border border-neutral-200 px-4 py-3 text-base text-neutral-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-neutral-600">
          참여자 닉네임(쉼표로 구분, 선택)
          <input
            type="text"
            name="participantNicknames"
            placeholder="예: 김철수, 박영희"
            className="rounded-2xl border border-neutral-200 px-4 py-3 text-base text-neutral-900"
          />
        </label>
        <p className="text-xs text-neutral-400">
          여기서 직접 지정하지 않아도, 약속을 만든 뒤 링크를 공유해 참여자를 초대할 수 있어요.
        </p>

        <button type="submit" className="rounded-2xl bg-brand px-4 py-3 font-semibold text-white">
          약속 만들기
        </button>
      </form>
    </main>
  );
}
