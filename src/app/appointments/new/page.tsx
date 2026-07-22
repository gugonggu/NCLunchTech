import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { searchAppointmentRestaurants } from "@/lib/appointments/restaurant-search";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  APPOINTMENT_STATUS_MESSAGES,
  formatSeoulDateTimeLocal,
  getDefaultAppointmentTime,
  isAppointmentStatusCode,
} from "@/lib/appointments/validation";
import { buttonStyles } from "@/components/ui/Button";
import { GradientBackdrop, GRADIENT_TEXT } from "@/components/ui/GradientBackdrop";
import { createAppointment } from "./actions";
import { RestaurantPicker } from "./RestaurantPicker";
import { PublicRecruitmentFields } from "./PublicRecruitmentFields";

interface NewAppointmentSearchParams {
  restaurantId?: string;
  status?: string;
  fromPollId?: string;
  q?: string;
  category?: string;
  radius?: string;
  openNow?: string;
  sort?: string;
  page?: string;
}

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<NewAppointmentSearchParams>;
}) {
  const params = await searchParams;
  const { restaurantId, status, fromPollId } = params;

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
    return (
      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 overflow-hidden px-6 py-8">
        <GradientBackdrop />
        <RestaurantPicker state={await searchAppointmentRestaurants(params)} />
      </main>
    );
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, kakao_place_id, name, category")
    .eq("id", restaurantId)
    .eq("is_active", true)
    .maybeSingle();

  if (!restaurant) {
    notFound();
  }

  const feedbackMessage = isAppointmentStatusCode(status) ? APPOINTMENT_STATUS_MESSAGES[status] : null;
  const defaultScheduledAt = formatSeoulDateTimeLocal(getDefaultAppointmentTime(new Date()));

  return (
    <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 overflow-hidden px-6 py-8">
      <GradientBackdrop />
      <Link href={`/restaurants/${restaurant.id}`} className="text-sm text-ink-muted">
        ← 뒤로
      </Link>

      <h1 className={`text-2xl font-extrabold tracking-tight sm:text-3xl ${GRADIENT_TEXT}`}>함께 먹기</h1>
      <p className="text-ink">
        {restaurant.name} · {restaurant.category}
      </p>

      {restaurant.kakao_place_id ? (
        <a
          href={`https://place.map.kakao.com/${restaurant.kakao_place_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-dark underline"
        >
          카카오맵에서 보기
        </a>
      ) : null}

      {feedbackMessage && <p className="text-sm text-danger">{feedbackMessage}</p>}
      {fromPollId && (
        <p className="rounded-card bg-brand-bg px-4 py-3 text-sm text-brand-dark">
          투표로 정해진 식당이에요.
        </p>
      )}

      <form action={createAppointment.bind(null, restaurant.id)} className="flex flex-col gap-3">
        {fromPollId && <input type="hidden" name="fromPollId" value={fromPollId} />}
        <label className="flex flex-col gap-1 text-sm text-ink-muted">
          약속 시각
          <input
            type="datetime-local"
            name="scheduledAt"
            defaultValue={defaultScheduledAt}
            required
            className="rounded-control border border-line px-4 py-3 text-base text-ink"
          />
        </label>

        <fieldset className="flex flex-col gap-2 text-sm text-ink-muted">
          <legend>식사 방식</legend>
          <label className="flex items-center gap-2 text-ink">
            <input type="radio" name="mealType" value="dine_in" defaultChecked />
            방문
          </label>
          <label className="flex items-center gap-2 text-ink">
            <input type="radio" name="mealType" value="delivery" />
            배달
          </label>
        </fieldset>

        <label className="flex flex-col gap-1 text-sm text-ink-muted">
          메모(선택, 최대 100자)
          <textarea
            name="memo"
            maxLength={100}
            rows={2}
            placeholder="예: 회의실 앞에서 12시 반에 모여요"
            className="rounded-control border border-line px-4 py-3 text-base text-ink"
          />
        </label>

        <PublicRecruitmentFields />
        <p className="text-xs text-ink-muted">
          여기서 직접 지정하지 않아도, 약속을 만든 뒤 링크를 공유해 참여자를 초대할 수 있어요.
        </p>

        <button type="submit" className={buttonStyles({ block: true })}>
          약속 만들기
        </button>
      </form>
    </main>
  );
}
