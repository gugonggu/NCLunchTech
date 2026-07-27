"use server";

import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { abandonWorldcupSession, createWorldcupSession, selectWorldcupMatch } from "@/lib/worldcup/service";
import { isWorldcupGameType, UUID_PATTERN, type WorldcupGameType } from "@/lib/worldcup/validation";

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

export async function abandonWorldcupAction(sessionId: string) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect("/login");
  }

  await abandonWorldcupSession(sessionId, employee.id);
  redirectWithStatus("abandoned");
}
