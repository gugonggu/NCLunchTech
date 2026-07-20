import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAppointmentDetail, getMyParticipant } from "@/lib/appointments/queries";
import { getWinningOptionIds, shouldLazyClose, type PollStatus, type PollType } from "./validation";

export interface PollOptionDetail {
  id: string;
  label: string;
  voteCount: number;
  restaurantId: string | null;
}

export interface PollDetail {
  id: string;
  createdBy: string;
  creatorNickname: string;
  pollType: PollType;
  restaurantId: string | null;
  restaurantName: string | null;
  appointmentId: string | null;
  status: PollStatus;
  closesAt: string;
  decidedOptionId: string | null;
  options: PollOptionDetail[];
  myOptionId: string | null;
}

/** 마감시각이 지난 open 투표를 조회 시점에 closed로 지연 반영한다(appointments의 0013 lazy update와 동일 패턴). */
async function closeIfExpired(
  supabase: ReturnType<typeof createServiceRoleClient>,
  poll: { id: string; status: PollStatus; closes_at: string }
): Promise<PollStatus> {
  const now = new Date();
  if (!shouldLazyClose(poll.status, new Date(poll.closes_at), now)) {
    return poll.status;
  }

  await supabase
    .from("polls")
    .update({ status: "closed", closed_at: now.toISOString() })
    .eq("id", poll.id)
    .eq("status", "open");

  return "closed";
}

export async function getPollDetail(pollId: string, employeeId: string | null): Promise<PollDetail | null> {
  const supabase = createServiceRoleClient();

  const { data: poll } = await supabase
    .from("polls")
    .select(
      "id, created_by, poll_type, restaurant_id, appointment_id, status, closes_at, decided_option_id, employees(nickname), restaurants(name)"
    )
    .eq("id", pollId)
    .maybeSingle();

  if (!poll) {
    return null;
  }

  const status = await closeIfExpired(supabase, poll);

  const [{ data: options }, { data: votes }] = await Promise.all([
    supabase
      .from("poll_options")
      .select("id, restaurant_id, menu_item_id, custom_label, restaurants(name), menu_items(name)")
      .eq("poll_id", pollId)
      .order("position"),
    supabase.from("poll_votes").select("option_id, employee_id").eq("poll_id", pollId),
  ]);

  const countByOption = new Map<string, number>();
  for (const vote of votes ?? []) {
    countByOption.set(vote.option_id, (countByOption.get(vote.option_id) ?? 0) + 1);
  }
  const myVote = employeeId ? (votes ?? []).find((v) => v.employee_id === employeeId) : undefined;

  const optionDetails: PollOptionDetail[] = (options ?? []).map((o) => {
    const restaurant = o.restaurants as unknown as { name: string } | null;
    const menuItem = o.menu_items as unknown as { name: string } | null;
    return {
      id: o.id,
      label: restaurant?.name ?? menuItem?.name ?? o.custom_label ?? "",
      voteCount: countByOption.get(o.id) ?? 0,
      restaurantId: o.restaurant_id,
    };
  });

  const creator = poll.employees as unknown as { nickname: string } | null;
  const restaurant = poll.restaurants as unknown as { name: string } | null;

  return {
    id: poll.id,
    createdBy: poll.created_by,
    creatorNickname: creator?.nickname ?? "(알 수 없음)",
    pollType: poll.poll_type as PollType,
    restaurantId: poll.restaurant_id,
    restaurantName: restaurant?.name ?? null,
    appointmentId: poll.appointment_id,
    status,
    closesAt: poll.closes_at,
    decidedOptionId: poll.decided_option_id,
    options: optionDetails,
    myOptionId: myVote?.option_id ?? null,
  };
}

export function getWinningIds(options: PollOptionDetail[]): string[] {
  return getWinningOptionIds(options.map((o) => ({ optionId: o.id, voteCount: o.voteCount })));
}

/** 약속에 연결된 투표에서 투표 가능한 사람인지 확인한다: 방장 또는 수락(accepted)한 참여자만. */
export async function isEligibleAppointmentVoter(appointmentId: string, employeeId: string): Promise<boolean> {
  const appointment = await getAppointmentDetail(appointmentId);
  if (!appointment) {
    return false;
  }
  if (appointment.hostEmployeeId === employeeId) {
    return true;
  }
  const participant = await getMyParticipant(appointmentId, employeeId);
  return participant?.status === "accepted";
}

export interface AppointmentPollSummary {
  id: string;
  pollType: PollType;
  status: PollStatus;
  closesAt: string;
  totalVotes: number;
}

/** 약속 상세에 표시할 연결된 투표 요약 목록(마감 지연 반영은 하지 않음 — 화면에서 closesAt로 판단). */
export async function getAppointmentPolls(appointmentId: string): Promise<AppointmentPollSummary[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("polls")
    .select("id, poll_type, status, closes_at, created_at, poll_votes(id)")
    .eq("appointment_id", appointmentId)
    .order("created_at");

  return (data ?? []).map((p) => ({
    id: p.id,
    pollType: p.poll_type as PollType,
    status: p.status as PollStatus,
    closesAt: p.closes_at,
    totalVotes: (p.poll_votes ?? []).length,
  }));
}

/** 약속 취소 또는 식당 변경 시, 그 약속에 연결된 열린 투표(메뉴 투표)를 자동으로 마감한다. */
export async function closeOpenPollsForAppointment(appointmentId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase
    .from("polls")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("appointment_id", appointmentId)
    .eq("status", "open");
}
