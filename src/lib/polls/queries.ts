import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getWinningOptionIds, shouldLazyClose, type PollStatus, type PollType } from "./validation";

export interface PollOptionDetail {
  id: string;
  label: string;
  voteCount: number;
}

export interface PollDetail {
  id: string;
  createdBy: string;
  creatorNickname: string;
  pollType: PollType;
  restaurantId: string | null;
  restaurantName: string | null;
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
      "id, created_by, poll_type, restaurant_id, status, closes_at, decided_option_id, employees(nickname), restaurants(name)"
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
