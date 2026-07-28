"use server";

import { redirect } from "next/navigation";
import { decideRestaurant } from "@/app/visits/actions";
import { getCurrentEmployee } from "@/lib/auth/session";
import {
  abandonWorldcupSession,
  createWorldcupSession,
  getWorldcupSessionDetail,
  selectWorldcupMatch,
} from "@/lib/worldcup/service";
import { isWorldcupGameType, UUID_PATTERN, type WorldcupGameType } from "@/lib/worldcup/validation";
import { recordWorldcupWinnerSelection } from "@/lib/worldcup/winner-selection";

function redirectWithStatus(status: string): never {
  redirect(`/worldcup?status=${status}`);
}

export async function startWorldcup(gameType: WorldcupGameType) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect("/login?returnTo=%2Fworldcup");
  }

  const safeGameType = isWorldcupGameType(gameType) ? gameType : "MENU";
  const result = await createWorldcupSession(employee.id, safeGameType);
  if (result.status === "not_enough_candidates") {
    redirectWithStatus("not_enough_candidates");
  }

  redirect(`/worldcup/${result.session.id}`);
}

export async function selectWorldcupMatchAction(sessionId: string, matchId: string, selectedMenuKey: string) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/worldcup/${sessionId}`)}`);
  }

  if (!UUID_PATTERN.test(sessionId) || !UUID_PATTERN.test(matchId) || typeof selectedMenuKey !== "string" || !selectedMenuKey) {
    redirectWithStatus("invalid_selection");
  }

  const result = await selectWorldcupMatch(sessionId, employee.id, matchId, selectedMenuKey);

  if (result.status === "not_found") {
    redirectWithStatus("not_found");
  }
  if (result.status === "invalid_selection") {
    redirect(`/worldcup/${sessionId}?status=invalid_selection`);
  }

  redirect(`/worldcup/${sessionId}`);
}

/**
 * 월드컵 결과 화면의 "이 식당으로 결정" 전용 래퍼. 우승 후보가 실제로 이 세션의 결과에
 * 속하는 식당인지 확인한 뒤 연동 기록을 남기고, 기존 결정 로직(decideRestaurant)을 그대로 재사용한다.
 */
export async function decideWorldcupWinnerRestaurant(sessionId: string, restaurantId: string) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/worldcup/${sessionId}`)}`);
  }

  if (UUID_PATTERN.test(sessionId) && UUID_PATTERN.test(restaurantId)) {
    const session = await getWorldcupSessionDetail(sessionId, employee.id);
    const winner = session?.status === "COMPLETED" ? session.candidates.find((c) => c.menuKey === session.winnerMenuKey) : null;

    if (winner?.restaurantIds.includes(restaurantId)) {
      await recordWorldcupWinnerSelection(employee.id, sessionId, restaurantId);
    }
  }

  await decideRestaurant(restaurantId);
}

export async function abandonWorldcupAction(sessionId: string) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect("/login");
  }

  await abandonWorldcupSession(sessionId, employee.id);
  redirectWithStatus("abandoned");
}
