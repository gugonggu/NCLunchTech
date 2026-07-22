"use server";

import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { distanceInMeters } from "@/lib/geo";
import { chooseTiedOption, isTieResolutionMethod, type TieResolutionMethod } from "@/lib/polls/tie-resolution";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getPollDetail, getWinningIds, isEligibleAppointmentVoter, type PollDetail } from "@/lib/polls/queries";
import { getAcceptedParticipantEmployeeIds, createNotification } from "@/lib/notifications/queries";
import { buildPollClosedMessage, buildPollDecidedMessage } from "@/lib/notifications/validation";

function redirectWithStatus(pollId: string, status: string): never {
  redirect(`/polls/${pollId}?status=${status}`);
}

export async function voteInPoll(pollId: string, optionId: string) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/polls/${pollId}`)}`);
  }

  const poll = await getPollDetail(pollId, employee.id);
  if (!poll) {
    redirectWithStatus(pollId, "not_found");
  }
  if (poll.status !== "open") {
    redirectWithStatus(pollId, "already_closed");
  }
  if (!poll.options.some((o) => o.id === optionId)) {
    redirectWithStatus(pollId, "invalid_option");
  }
  if (poll.appointmentId && !(await isEligibleAppointmentVoter(poll.appointmentId, employee.id))) {
    redirectWithStatus(pollId, "not_eligible_voter");
  }

  const supabase = createServiceRoleClient();
  const wasAlreadyVoted = poll.myOptionId !== null;
  const { error } = await supabase.from("poll_votes").upsert(
    {
      poll_id: pollId,
      option_id: optionId,
      employee_id: employee.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "poll_id,employee_id" }
  );

  if (error) {
    throw new Error("투표에 실패했습니다.");
  }

  redirectWithStatus(pollId, wasAlreadyVoted ? "vote_changed" : "voted");
}

export async function cancelVote(pollId: string) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/polls/${pollId}`)}`);
  }

  const poll = await getPollDetail(pollId, employee.id);
  if (!poll) {
    redirectWithStatus(pollId, "not_found");
  }
  if (poll.status !== "open") {
    redirectWithStatus(pollId, "already_closed");
  }
  if (poll.appointmentId && !(await isEligibleAppointmentVoter(poll.appointmentId, employee.id))) {
    redirectWithStatus(pollId, "not_eligible_voter");
  }

  const supabase = createServiceRoleClient();
  await supabase.from("poll_votes").delete().eq("poll_id", pollId).eq("employee_id", employee.id);

  redirectWithStatus(pollId, "vote_cancelled");
}

export async function closePoll(pollId: string) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/polls/${pollId}`)}`);
  }

  const poll = await getPollDetail(pollId, employee.id);
  if (!poll) {
    redirectWithStatus(pollId, "not_found");
  }
  if (poll.createdBy !== employee.id) {
    redirectWithStatus(pollId, "not_creator");
  }
  if (poll.status !== "open") {
    redirectWithStatus(pollId, "already_closed");
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("polls")
    .update({ status: "closed", closed_at: now })
    .eq("id", poll.id)
    .eq("status", "open");

  if (error) {
    throw new Error("투표 마감에 실패했습니다.");
  }

  if (poll.appointmentId && poll.restaurantName) {
    const participantIds = await getAcceptedParticipantEmployeeIds(poll.appointmentId);
    const message = buildPollClosedMessage(poll.restaurantName);
    await Promise.all(
      participantIds.map((employeeId) =>
        createNotification({
          employeeId,
          type: "poll_closed",
          message,
          relatedAppointmentId: poll.appointmentId as string,
        })
      )
    );
  }

  redirectWithStatus(pollId, "closed");
}

export async function decidePoll(pollId: string, optionId: string) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/polls/${pollId}`)}`);
  }

  const poll = await getPollDetail(pollId, employee.id);
  if (!poll) {
    redirectWithStatus(pollId, "not_found");
  }
  if (poll.createdBy !== employee.id) {
    redirectWithStatus(pollId, "not_creator");
  }
  if (poll.status === "open") {
    redirectWithStatus(pollId, "not_closed");
  }
  if (poll.status === "decided") {
    redirectWithStatus(pollId, "already_decided");
  }
  if (!poll.options.some((o) => o.id === optionId)) {
    redirectWithStatus(pollId, "invalid_option");
  }

  await finalizePollDecision(poll, optionId);

  redirectWithStatus(pollId, "decided");
}

async function finalizePollDecision(poll: PollDetail, optionId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("polls")
    .update({ status: "decided", decided_option_id: optionId, decided_at: now })
    .eq("id", poll.id)
    .eq("status", "closed");

  if (error) {
    throw new Error("결과 확정에 실패했습니다.");
  }

  if (poll.appointmentId && poll.restaurantName) {
    const decidedOption = poll.options.find((o) => o.id === optionId);
    const participantIds = await getAcceptedParticipantEmployeeIds(poll.appointmentId);
    const message = buildPollDecidedMessage(poll.restaurantName, decidedOption?.label ?? "메뉴");
    await Promise.all(
      participantIds.map((employeeId) =>
        createNotification({
          employeeId,
          type: "poll_decided",
          message,
          relatedAppointmentId: poll.appointmentId as string,
        })
      )
    );
  }
}

export async function resolvePollTie(pollId: string, method: string) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/polls/${pollId}`)}`);
  }

  if (!isTieResolutionMethod(method)) {
    redirectWithStatus(pollId, "invalid_input");
  }

  const poll = await getPollDetail(pollId, employee.id);
  if (!poll) {
    redirectWithStatus(pollId, "not_found");
  }
  if (poll.createdBy !== employee.id) {
    redirectWithStatus(pollId, "not_creator");
  }
  if (poll.status === "open") {
    redirectWithStatus(pollId, "not_closed");
  }
  if (poll.status === "decided") {
    redirectWithStatus(pollId, "already_decided");
  }
  if (poll.pollType === "menu" && method !== "random") {
    redirectWithStatus(pollId, "invalid_input");
  }

  const winningIds = new Set(getWinningIds(poll.options));
  const tiedOptions = poll.options.filter((option) => winningIds.has(option.id));
  if (tiedOptions.length < 2) {
    redirectWithStatus(pollId, "invalid_input");
  }

  const optionId = await chooseTieWinner(poll, tiedOptions, method);
  if (!optionId) {
    redirectWithStatus(pollId, "invalid_input");
  }

  await finalizePollDecision(poll, optionId);
  redirectWithStatus(pollId, "decided");
}

export async function resolvePollTieWithOption(pollId: string, optionId: string) {
  const employee = await getCurrentEmployee();
  if (!employee) redirect(`/login?returnTo=${encodeURIComponent(`/polls/${pollId}`)}`);
  const poll = await getPollDetail(pollId, employee.id);
  if (!poll || poll.createdBy !== employee.id || poll.status !== "closed") redirectWithStatus(pollId, "not_creator");
  const winningIds = new Set(getWinningIds(poll.options));
  if (!winningIds.has(optionId)) redirectWithStatus(pollId, "invalid_input");
  await finalizePollDecision(poll, optionId);
  redirectWithStatus(pollId, "decided");
}

async function chooseTieWinner(
  poll: PollDetail,
  tiedOptions: PollDetail["options"],
  method: TieResolutionMethod
): Promise<string | null> {
  if (method === "random") {
    return chooseTiedOption(tiedOptions, method)?.id ?? null;
  }

  const restaurantIds = tiedOptions.flatMap((option) => (option.restaurantId ? [option.restaurantId] : []));
  if (restaurantIds.length === 0) {
    return chooseTiedOption(tiedOptions, method)?.id ?? null;
  }

  const supabase = createServiceRoleClient();
  if (method === "nearest") {
    const [{ data: settings }, { data: restaurants }] = await Promise.all([
      supabase.from("app_settings").select("company_lat, company_lng").eq("id", 1).maybeSingle(),
      supabase.from("restaurants").select("id, lat, lng").in("id", restaurantIds),
    ]);
    const companyLat = settings?.company_lat;
    const companyLng = settings?.company_lng;
    if (companyLat === null || companyLat === undefined || companyLng === null || companyLng === undefined) {
      return chooseTiedOption(tiedOptions, method)?.id ?? null;
    }
    const distanceByRestaurantId = new Map(
      (restaurants ?? []).map((restaurant) => [
        restaurant.id,
        distanceInMeters(
          { lat: Number(companyLat), lng: Number(companyLng) },
          { lat: Number(restaurant.lat), lng: Number(restaurant.lng) }
        ),
      ])
    );
    return (
      chooseTiedOption(
        tiedOptions.map((option) => ({
          ...option,
          distanceM: option.restaurantId ? distanceByRestaurantId.get(option.restaurantId) : undefined,
        })),
        method
      )?.id ?? null
    );
  }

  const { data: visits } = await supabase
    .from("visits")
    .select("restaurant_id")
    .eq("status", "completed")
    .in("restaurant_id", restaurantIds);
  const visitCountByRestaurantId = new Map<string, number>();
  for (const visit of visits ?? []) {
    visitCountByRestaurantId.set(visit.restaurant_id, (visitCountByRestaurantId.get(visit.restaurant_id) ?? 0) + 1);
  }
  return (
    chooseTiedOption(
      tiedOptions.map((option) => ({
        ...option,
        completedVisitCount: option.restaurantId ? (visitCountByRestaurantId.get(option.restaurantId) ?? 0) : undefined,
      })),
      method
    )?.id ?? null
  );
}
