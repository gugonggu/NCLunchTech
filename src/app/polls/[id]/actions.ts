"use server";

import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getPollDetail } from "@/lib/polls/queries";

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
    .eq("id", pollId)
    .eq("status", "open");

  if (error) {
    throw new Error("투표 마감에 실패했습니다.");
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

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("polls")
    .update({ status: "decided", decided_option_id: optionId, decided_at: now })
    .eq("id", pollId)
    .eq("status", "closed");

  if (error) {
    throw new Error("결과 확정에 실패했습니다.");
  }

  redirectWithStatus(pollId, "decided");
}
