import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isPastConfirmationWindow } from "@/lib/confirmation-window";
import { getAppointmentDetail, getMyParticipant, getParticipants } from "@/lib/appointments/queries";
import { getMealRecordForSource } from "@/lib/meals/queries";
import { getAppointmentPolls } from "@/lib/polls/queries";
import { MAX_POLL_OPTIONS } from "@/lib/polls/validation";
import {
  APPOINTMENT_STATUS_MESSAGES,
  formatSeoulDateTimeLocal,
  isAppointmentStatusCode,
} from "@/lib/appointments/validation";
import {
  cancelAppointment,
  confirmAttendance,
  confirmHostAttendance,
  createAppointmentMenuPoll,
  markHostNoShow,
  markParticipantNoShow,
  respondToInvite,
  updateAppointmentSchedule,
  upsertSettlementAction,
  withdrawParticipation,
} from "./actions";
import { getAttendeesForAppointment, getSettlementForAppointment } from "@/lib/settlements/queries";
import {
  MAX_SETTLEMENT_AMOUNT,
  SETTLEMENT_STATUS_MESSAGES,
  buildSettlementClipboardText,
  isSettlementStatusCode,
} from "@/lib/settlements/validation";
import { SettlementCopyButton } from "../SettlementCopyButton";

const POLL_STATUS_LABELS: Record<string, string> = {
  open: "진행 중",
  closed: "마감됨 · 결과 확정 대기",
  decided: "결과 확정됨",
};

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
  expired: "응답 없음",
};

export default async function AppointmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; settlementStatus?: string }>;
}) {
  const { id } = await params;
  const { status, settlementStatus } = await searchParams;

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
  const attendanceCompleted = isHost
    ? appointment.hostAttendanceStatus === "completed"
    : myParticipant?.status === "completed";
  const mealRecord = attendanceCompleted
    ? await getMealRecordForSource(employee.id, { appointmentId: id })
    : null;

  const hostNeedsConfirmation =
    isHost && needsConfirmation && appointment.hostAttendanceStatus === null;
  const participantNeedsConfirmation =
    !isHost && needsConfirmation && myParticipant?.status === "accepted";

  const settlementAttendees = await getAttendeesForAppointment(id);
  const isSettlementAttendee = settlementAttendees.some((a) => a.employeeId === employee.id);
  const settlement = settlementAttendees.length > 0 ? await getSettlementForAppointment(id) : null;
  const settlementFeedback = isSettlementStatusCode(settlementStatus)
    ? SETTLEMENT_STATUS_MESSAGES[settlementStatus]
    : null;

  const appointmentPolls = await getAppointmentPolls(id);
  let pollableMenuItems: { id: string; name: string; price: number | null }[] = [];
  if (isHost && isOpen) {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("menu_items")
      .select("id, name, price")
      .eq("restaurant_id", appointment.restaurantId)
      .eq("is_sold_out", false)
      .order("name");
    pollableMenuItems = data ?? [];
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-8">
      <Link href="/" className="text-sm text-ink-muted">
        ← 홈으로
      </Link>

      <h1 className="text-xl font-bold text-brand-dark">동료와 함께</h1>

      {feedbackMessage && (
        <p className="rounded-card bg-surface px-4 py-3 text-sm text-brand-dark shadow-card">{feedbackMessage}</p>
      )}

      {isCancelled && (
        <p className="rounded-card bg-surface-muted px-4 py-3 text-sm text-ink-muted">
          이 약속은 취소되었습니다.
        </p>
      )}
      {!isCancelled && isExpired && !needsConfirmation && (
        <p className="rounded-card bg-surface-muted px-4 py-3 text-sm text-ink-muted">
          이미 지난 약속입니다.
        </p>
      )}

      <div className="rounded-card border border-line px-4 py-4">
        <Link href={`/restaurants/${appointment.restaurantId}`} className="font-semibold text-brand-dark">
          {appointment.restaurantName}
        </Link>
        <p className="text-sm text-ink-muted">{appointment.restaurantCategory}</p>
        <p className="mt-2 text-sm text-ink">{displayFormatter.format(scheduledAt)}</p>
        {appointment.memo && <p className="mt-2 text-sm text-ink">{appointment.memo}</p>}
      </div>

      {(appointmentPolls.length > 0 || (isHost && isOpen)) && (
        <section className="flex flex-col gap-3">
          <h2 className="font-bold text-brand-dark">메뉴 투표</h2>

          {appointmentPolls.length > 0 && (
            <ul className="flex flex-col gap-2">
              {appointmentPolls.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/polls/${p.id}`}
                    className="flex items-center justify-between rounded-card border border-line px-4 py-3"
                  >
                    <span>{POLL_STATUS_LABELS[p.status] ?? p.status}</span>
                    <span className="text-sm text-ink-muted">{p.totalVotes}표</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {isHost && isOpen && (
            <form action={createAppointmentMenuPoll.bind(null, id)} className="flex flex-col gap-3">
              <p className="text-sm text-ink-muted">
                수락한 참여자만 투표할 수 있어요. 등록 메뉴 선택과 직접 입력을 합쳐서 최대 {MAX_POLL_OPTIONS}
                개까지 가능해요.
              </p>

              {pollableMenuItems.length === 0 ? (
                <p className="text-sm text-ink-muted">등록된 메뉴가 없어요. 직접 입력만 사용할 수 있어요.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {pollableMenuItems.map((m) => (
                    <li key={m.id}>
                      <label className="flex items-center justify-between gap-3 rounded-card border border-line px-4 py-3">
                        <span>{m.name}</span>
                        <span className="flex items-center gap-3 text-sm text-ink-muted">
                          {m.price != null ? `${m.price.toLocaleString("ko-KR")}원` : "가격 정보 없음"}
                          <input type="checkbox" name="menuItemIds" value={m.id} />
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-col gap-2">
                <p className="text-sm text-ink-muted">직접 입력(선택)</p>
                {[0, 1, 2].map((i) => (
                  <input
                    key={i}
                    type="text"
                    name="customLabels"
                    maxLength={50}
                    placeholder="예: 오늘의 특선"
                    className="rounded-control border border-line px-4 py-3"
                  />
                ))}
              </div>

              <label className="flex flex-col gap-1 text-sm text-ink-muted">
                마감 시각
                <input
                  type="datetime-local"
                  name="closesAt"
                  required
                  className="rounded-control border border-line px-4 py-3 text-base text-ink"
                />
              </label>

              <button type="submit" className="rounded-control bg-surface-muted px-4 py-3 text-sm font-semibold">
                메뉴 투표 만들기
              </button>
            </form>
          )}
        </section>
      )}

      {hostNeedsConfirmation && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-ink-muted">방문을 확인해주세요.</p>
          <div className="flex gap-2">
            <form action={confirmHostAttendance.bind(null, id)} className="flex-1">
              <button type="submit" className="w-full rounded-control bg-brand px-4 py-3 font-semibold text-black">
                다녀왔어요
              </button>
            </form>
            <form action={markHostNoShow.bind(null, id)} className="flex-1">
              <button
                type="submit"
                className="w-full rounded-control bg-surface px-4 py-3 font-semibold text-ink-muted shadow-card"
              >
                가지 않았어요
              </button>
            </form>
          </div>
          <Link href="/" className="text-center text-sm text-ink-muted">
            나중에 할게요
          </Link>
        </div>
      )}

      {isHost && appointment.hostAttendanceStatus === "completed" && (
        <div className="flex flex-col gap-2">
          {mealRecord && (
            <p className="text-sm text-ink-muted">
              {mealRecord.menuName} · {mealRecord.paidPrice.toLocaleString("ko-KR")}원
            </p>
          )}
          <Link
            href={`/reviews/new?restaurantId=${appointment.restaurantId}&appointmentId=${appointment.id}`}
            className="rounded-control bg-surface px-4 py-3 text-center text-sm font-semibold text-brand-dark shadow-card"
          >
            리뷰 남기기
          </Link>
        </div>
      )}

      {settlementAttendees.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-bold text-brand-dark">정산(N빵)</h2>

          {settlementFeedback && (
            <p className="rounded-card bg-surface px-4 py-3 text-sm text-brand-dark shadow-card">{settlementFeedback}</p>
          )}

          {settlement ? (
            <div className="flex flex-col gap-2 rounded-card border border-line px-4 py-4">
              <p className="text-sm text-ink-muted">
                총 {settlement.totalAmount.toLocaleString("ko-KR")}원 / {settlement.shares.length}명
              </p>
              <ul className="flex flex-col gap-1">
                {settlement.shares.map((s) => (
                  <li key={s.employeeId} className="flex items-center justify-between text-sm">
                    <span>
                      {s.employeeNickname}
                      {s.isPayer ? " (결제자)" : ""}
                    </span>
                    <span>{s.amount.toLocaleString("ko-KR")}원</span>
                  </li>
                ))}
              </ul>
              <SettlementCopyButton
                text={buildSettlementClipboardText({
                  restaurantName: appointment.restaurantName,
                  totalAmount: settlement.totalAmount,
                  shares: settlement.shares.map((s) => ({
                    employeeNickname: s.employeeNickname,
                    amount: s.amount,
                    isPayer: s.isPayer,
                  })),
                })}
              />
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              아직 정산 내역이 없어요. 결제한 사람이 총금액을 입력해보세요.
            </p>
          )}

          {isSettlementAttendee && (
            <form action={upsertSettlementAction.bind(null, id)} className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-sm text-ink-muted">
                결제한 사람
                <select
                  name="payerEmployeeId"
                  defaultValue={settlement?.payerEmployeeId ?? employee.id}
                  required
                  className="rounded-control border border-line px-4 py-3 text-base text-ink"
                >
                  {settlementAttendees.map((a) => (
                    <option key={a.employeeId} value={a.employeeId}>
                      {a.employeeNickname}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink-muted">
                총 결제 금액
                <input
                  type="number"
                  name="totalAmount"
                  inputMode="numeric"
                  min={1}
                  max={MAX_SETTLEMENT_AMOUNT}
                  defaultValue={settlement?.totalAmount}
                  required
                  className="rounded-control border border-line px-4 py-3 text-base text-ink"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink-muted">
                정산 단위
                <select
                  name="roundingUnit"
                  defaultValue={settlement?.roundingUnit ?? 100}
                  required
                  className="rounded-control border border-line px-4 py-3 text-base text-ink"
                >
                  <option value={1}>1원</option>
                  <option value={10}>10원</option>
                  <option value={100}>100원</option>
                </select>
              </label>
              <button type="submit" className="rounded-control bg-surface-muted px-4 py-3 text-sm font-semibold">
                {settlement ? "정산 다시 계산하기" : "정산하기"}
              </button>
            </form>
          )}
        </section>
      )}

      {isHost && (
        <section className="flex flex-col gap-3">
          <h2 className="font-bold text-brand-dark">참여자</h2>
          {participants.length === 0 ? (
            <p className="text-sm text-ink-muted">아직 초대한 동료가 없어요. 링크를 공유해보세요.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {participants.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-card border border-line px-4 py-3"
                >
                  <span>{p.employeeNickname}</span>
                  <span className="text-sm text-ink-muted">
                    {isOpen && p.status === "pending" ? "대기 중" : PARTICIPANT_STATUS_LABELS[p.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {isOpen && (
            <>
              <form action={updateAppointmentSchedule.bind(null, id)} className="flex flex-col gap-2">
                <label className="flex flex-col gap-1 text-sm text-ink-muted">
                  약속 시각 변경
                  <input
                    type="datetime-local"
                    name="scheduledAt"
                    defaultValue={formatSeoulDateTimeLocal(scheduledAt)}
                    required
                    className="rounded-control border border-line px-4 py-3 text-base text-ink"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-ink-muted">
                  메모
                  <textarea
                    name="memo"
                    maxLength={100}
                    rows={2}
                    defaultValue={appointment.memo ?? ""}
                    className="rounded-control border border-line px-4 py-3 text-base text-ink"
                  />
                </label>
                <button type="submit" className="rounded-control bg-surface-muted px-4 py-3 text-sm font-semibold">
                  시각·메모 저장
                </button>
              </form>

              <Link
                href={`/restaurants?forAppointment=${id}`}
                className="rounded-control bg-surface-muted px-4 py-3 text-center text-sm font-semibold"
              >
                식당 변경
              </Link>

              <form action={cancelAppointment.bind(null, id)}>
                <button
                  type="submit"
                  className="w-full rounded-control bg-surface px-4 py-3 text-sm font-semibold text-red-600 shadow-card"
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
            <button type="submit" className="w-full rounded-control bg-brand px-4 py-3 font-semibold text-black">
              수락
            </button>
          </form>
          <form action={respondToInvite.bind(null, id, "declined")} className="flex-1">
            <button type="submit" className="w-full rounded-control bg-surface px-4 py-3 font-semibold text-ink-muted shadow-card">
              거절
            </button>
          </form>
        </div>
      )}

      {!isHost && isOpen && !myParticipant && (
        <div className="flex gap-2">
          <form action={respondToInvite.bind(null, id, "accepted")} className="flex-1">
            <button type="submit" className="w-full rounded-control bg-brand px-4 py-3 font-semibold text-black">
              참여하기
            </button>
          </form>
          <form action={respondToInvite.bind(null, id, "declined")} className="flex-1">
            <button type="submit" className="w-full rounded-control bg-surface px-4 py-3 font-semibold text-ink-muted shadow-card">
              거절
            </button>
          </form>
        </div>
      )}

      {participantNeedsConfirmation && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-ink-muted">방문을 확인해주세요.</p>
          <div className="flex gap-2">
            <form action={confirmAttendance.bind(null, id)} className="flex-1">
              <button type="submit" className="w-full rounded-control bg-brand px-4 py-3 font-semibold text-black">
                다녀왔어요
              </button>
            </form>
            <form action={markParticipantNoShow.bind(null, id)} className="flex-1">
              <button
                type="submit"
                className="w-full rounded-control bg-surface px-4 py-3 font-semibold text-ink-muted shadow-card"
              >
                가지 않았어요
              </button>
            </form>
          </div>
          <Link href="/" className="text-center text-sm text-ink-muted">
            나중에 할게요
          </Link>
        </div>
      )}

      {!isHost && isOpen && !needsConfirmation && myParticipant?.status === "accepted" && (
        <form action={withdrawParticipation.bind(null, id)}>
          <button
            type="submit"
            className="w-full rounded-control bg-surface px-4 py-3 text-sm font-semibold text-ink-muted shadow-card"
          >
            불참(참여 취소)
          </button>
        </form>
      )}

      {!isHost && myParticipant?.status === "completed" && (
        <div className="flex flex-col gap-2">
          {mealRecord && (
            <p className="text-sm text-ink-muted">
              {mealRecord.menuName} · {mealRecord.paidPrice.toLocaleString("ko-KR")}원
            </p>
          )}
          <Link
            href={`/reviews/new?restaurantId=${appointment.restaurantId}&appointmentId=${appointment.id}`}
            className="rounded-control bg-surface px-4 py-3 text-center text-sm font-semibold text-brand-dark shadow-card"
          >
            리뷰 남기기
          </Link>
        </div>
      )}

      {!isHost && myParticipant?.status === "declined" && (
        <p className="text-sm text-ink-muted">이 약속을 거절했어요.</p>
      )}
      {!isHost && myParticipant?.status === "cancelled" && (
        <p className="text-sm text-ink-muted">참여를 취소했어요.</p>
      )}
    </main>
  );
}
