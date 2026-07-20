import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { isPastConfirmationWindow } from "@/lib/confirmation-window";
import { getAppointmentDetail, getMyParticipant, getParticipants } from "@/lib/appointments/queries";
import {
  APPOINTMENT_STATUS_MESSAGES,
  formatSeoulDateTimeLocal,
  isAppointmentStatusCode,
} from "@/lib/appointments/validation";
import {
  cancelAppointment,
  confirmAttendance,
  confirmHostAttendance,
  markHostNoShow,
  respondToInvite,
  updateAppointmentSchedule,
  withdrawParticipation,
} from "./actions";

const displayFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const PARTICIPANT_STATUS_LABELS: Record<string, string> = {
  pending: "대기 중",
  accepted: "확정",
  declined: "거절",
  cancelled: "불참",
  completed: "다녀왔어요",
};

export default async function AppointmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const { status } = await searchParams;

  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/appointments/${id}`)}`);
  }

  const appointment = await getAppointmentDetail(id);
  if (!appointment) {
    notFound();
  }

  const now = new Date();
  const scheduledAt = new Date(appointment.scheduledAt);
  const feedbackMessage = isAppointmentStatusCode(status) ? APPOINTMENT_STATUS_MESSAGES[status] : null;
  const isHost = appointment.hostEmployeeId === employee.id;
  const isExpired = scheduledAt <= now;
  const isCancelled = appointment.status === "cancelled";
  const isOpen = !isCancelled && !isExpired;
  const needsConfirmation = !isCancelled && isPastConfirmationWindow(scheduledAt, now);

  const myParticipant = isHost ? null : await getMyParticipant(id, employee.id);
  const participants = isHost ? await getParticipants(id) : [];

  const hostNeedsConfirmation =
    isHost && needsConfirmation && appointment.hostAttendanceStatus === null;
  const participantNeedsConfirmation =
    !isHost && needsConfirmation && myParticipant?.status === "accepted";

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-8">
      <Link href="/" className="text-sm text-neutral-500">
        ← 홈으로
      </Link>

      <h1 className="text-xl font-bold text-brand-dark">동료와 함께</h1>

      {feedbackMessage && (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm text-brand-dark shadow-sm">{feedbackMessage}</p>
      )}

      {isCancelled && (
        <p className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
          이 약속은 취소되었습니다.
        </p>
      )}
      {!isCancelled && isExpired && !needsConfirmation && (
        <p className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
          이미 지난 약속입니다.
        </p>
      )}

      <div className="rounded-2xl border border-neutral-200 px-4 py-4">
        <Link href={`/restaurants/${appointment.restaurantId}`} className="font-semibold text-brand-dark">
          {appointment.restaurantName}
        </Link>
        <p className="text-sm text-neutral-500">{appointment.restaurantCategory}</p>
        <p className="mt-2 text-sm text-neutral-700">{displayFormatter.format(scheduledAt)}</p>
        {appointment.memo && <p className="mt-2 text-sm text-neutral-700">{appointment.memo}</p>}
      </div>

      {hostNeedsConfirmation && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-neutral-600">방문을 확인해주세요.</p>
          <div className="flex gap-2">
            <form action={confirmHostAttendance.bind(null, id)} className="flex-1">
              <button type="submit" className="w-full rounded-2xl bg-brand px-4 py-3 font-semibold text-white">
                다녀왔어요
              </button>
            </form>
            <form action={markHostNoShow.bind(null, id)} className="flex-1">
              <button
                type="submit"
                className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-neutral-600 shadow-sm"
              >
                가지 않았어요
              </button>
            </form>
          </div>
          <Link href="/" className="text-center text-sm text-neutral-400">
            나중에 할게요
          </Link>
        </div>
      )}

      {isHost && appointment.hostAttendanceStatus === "completed" && (
        <Link
          href={`/reviews/new?restaurantId=${appointment.restaurantId}`}
          className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-brand-dark shadow-sm"
        >
          리뷰 남기기
        </Link>
      )}

      {isHost && (
        <section className="flex flex-col gap-3">
          <h2 className="font-bold text-brand-dark">참여자</h2>
          {participants.length === 0 ? (
            <p className="text-sm text-neutral-500">아직 초대한 동료가 없어요. 링크를 공유해보세요.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {participants.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-2xl border border-neutral-200 px-4 py-3"
                >
                  <span>{p.employeeNickname}</span>
                  <span className="text-sm text-neutral-500">
                    {isOpen && p.status === "pending" ? "대기 중" : PARTICIPANT_STATUS_LABELS[p.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {isOpen && (
            <>
              <form action={updateAppointmentSchedule.bind(null, id)} className="flex flex-col gap-2">
                <label className="flex flex-col gap-1 text-sm text-neutral-600">
                  약속 시각 변경
                  <input
                    type="datetime-local"
                    name="scheduledAt"
                    defaultValue={formatSeoulDateTimeLocal(scheduledAt)}
                    required
                    className="rounded-2xl border border-neutral-200 px-4 py-3 text-base text-neutral-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-neutral-600">
                  메모
                  <textarea
                    name="memo"
                    maxLength={100}
                    rows={2}
                    defaultValue={appointment.memo ?? ""}
                    className="rounded-2xl border border-neutral-200 px-4 py-3 text-base text-neutral-900"
                  />
                </label>
                <button type="submit" className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm font-semibold">
                  시각·메모 저장
                </button>
              </form>

              <Link
                href={`/restaurants?forAppointment=${id}`}
                className="rounded-2xl bg-neutral-100 px-4 py-3 text-center text-sm font-semibold"
              >
                식당 변경
              </Link>

              <form action={cancelAppointment.bind(null, id)}>
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-red-600 shadow-sm"
                >
                  약속 전체 취소
                </button>
              </form>
            </>
          )}
        </section>
      )}

      {!isHost && isOpen && myParticipant && myParticipant.status === "pending" && (
        <div className="flex gap-2">
          <form action={respondToInvite.bind(null, id, "accepted")} className="flex-1">
            <button type="submit" className="w-full rounded-2xl bg-brand px-4 py-3 font-semibold text-white">
              수락
            </button>
          </form>
          <form action={respondToInvite.bind(null, id, "declined")} className="flex-1">
            <button type="submit" className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-neutral-600 shadow-sm">
              거절
            </button>
          </form>
        </div>
      )}

      {!isHost && isOpen && !myParticipant && (
        <div className="flex gap-2">
          <form action={respondToInvite.bind(null, id, "accepted")} className="flex-1">
            <button type="submit" className="w-full rounded-2xl bg-brand px-4 py-3 font-semibold text-white">
              참여하기
            </button>
          </form>
          <form action={respondToInvite.bind(null, id, "declined")} className="flex-1">
            <button type="submit" className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-neutral-600 shadow-sm">
              거절
            </button>
          </form>
        </div>
      )}

      {participantNeedsConfirmation && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-neutral-600">방문을 확인해주세요.</p>
          <div className="flex gap-2">
            <form action={confirmAttendance.bind(null, id)} className="flex-1">
              <button type="submit" className="w-full rounded-2xl bg-brand px-4 py-3 font-semibold text-white">
                다녀왔어요
              </button>
            </form>
            <form action={withdrawParticipation.bind(null, id)} className="flex-1">
              <button
                type="submit"
                className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-neutral-600 shadow-sm"
              >
                가지 않았어요
              </button>
            </form>
          </div>
          <Link href="/" className="text-center text-sm text-neutral-400">
            나중에 할게요
          </Link>
        </div>
      )}

      {!isHost && isOpen && !needsConfirmation && myParticipant?.status === "accepted" && (
        <form action={withdrawParticipation.bind(null, id)}>
          <button
            type="submit"
            className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-neutral-600 shadow-sm"
          >
            불참(참여 취소)
          </button>
        </form>
      )}

      {!isHost && myParticipant?.status === "completed" && (
        <Link
          href={`/reviews/new?restaurantId=${appointment.restaurantId}`}
          className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-brand-dark shadow-sm"
        >
          리뷰 남기기
        </Link>
      )}

      {!isHost && myParticipant?.status === "declined" && (
        <p className="text-sm text-neutral-500">이 약속을 거절했어요.</p>
      )}
      {!isHost && myParticipant?.status === "cancelled" && (
        <p className="text-sm text-neutral-500">참여를 취소했어요.</p>
      )}
    </main>
  );
}
