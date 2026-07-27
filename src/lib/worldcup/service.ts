import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { recordAchievementEvent } from "@/lib/achievements/events";
import { buildFirstRoundMatches, buildNextRoundMatches, extractRoundWinnersIfComplete } from "./bracket";
import { resolveTournamentSize, selectCandidatesWithCaps, type WorldcupCandidate, type WorldcupTournamentSize } from "./candidates";
import { fetchWorldcupMenuPool, fetchWorldcupRestaurantPool } from "./pool-queries";
import { MAX_MENUS_PER_CATEGORY, MAX_MENUS_PER_RESTAURANT, type WorldcupGameType } from "./validation";

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function totalRoundsFor(tournamentSize: WorldcupTournamentSize): number {
  return tournamentSize === 8 ? 3 : 2;
}

export interface WorldcupMatchRow {
  id: string;
  roundNumber: number;
  matchIndex: number;
  leftMenuKey: string;
  rightMenuKey: string;
  selectedMenuKey: string | null;
}

export type WorldcupSessionStatus = "IN_PROGRESS" | "COMPLETED" | "ABANDONED";

export interface WorldcupSessionDetail {
  id: string;
  status: WorldcupSessionStatus;
  gameType: WorldcupGameType;
  tournamentSize: WorldcupTournamentSize;
  currentRound: number;
  totalRounds: number;
  candidates: WorldcupCandidate[];
  matches: WorldcupMatchRow[];
  winnerMenuKey: string | null;
}

interface SessionRow {
  id: string;
  employee_id: string;
  status: WorldcupSessionStatus;
  game_type: WorldcupGameType;
  tournament_size: WorldcupTournamentSize;
  current_round: number;
  candidate_snapshot: WorldcupCandidate[];
  winner_menu_key: string | null;
}

interface MatchRow {
  id: string;
  round_number: number;
  match_index: number;
  left_menu_key: string;
  right_menu_key: string;
  selected_menu_key: string | null;
}

function mapMatchRow(row: MatchRow): WorldcupMatchRow {
  return {
    id: row.id,
    roundNumber: row.round_number,
    matchIndex: row.match_index,
    leftMenuKey: row.left_menu_key,
    rightMenuKey: row.right_menu_key,
    selectedMenuKey: row.selected_menu_key,
  };
}

function mapSessionDetail(session: SessionRow, matches: MatchRow[]): WorldcupSessionDetail {
  return {
    id: session.id,
    status: session.status,
    gameType: session.game_type,
    tournamentSize: session.tournament_size,
    currentRound: session.current_round,
    totalRounds: totalRoundsFor(session.tournament_size),
    candidates: session.candidate_snapshot,
    matches: matches.map(mapMatchRow),
    winnerMenuKey: session.winner_menu_key,
  };
}

async function loadSessionDetail(sessionId: string, employeeId: string): Promise<WorldcupSessionDetail | null> {
  const supabase = createServiceRoleClient();
  const [{ data: session }, { data: matches }] = await Promise.all([
    supabase
      .from("menu_worldcup_sessions")
      .select("id, employee_id, status, game_type, tournament_size, current_round, candidate_snapshot, winner_menu_key")
      .eq("id", sessionId)
      .eq("employee_id", employeeId)
      .maybeSingle(),
    supabase
      .from("menu_worldcup_matches")
      .select("id, round_number, match_index, left_menu_key, right_menu_key, selected_menu_key")
      .eq("session_id", sessionId)
      .order("round_number", { ascending: true })
      .order("match_index", { ascending: true }),
  ]);

  if (!session) {
    return null;
  }

  return mapSessionDetail(session as SessionRow, (matches ?? []) as MatchRow[]);
}

export async function getWorldcupSessionDetail(sessionId: string, employeeId: string): Promise<WorldcupSessionDetail | null> {
  return loadSessionDetail(sessionId, employeeId);
}

export async function getActiveWorldcupSession(employeeId: string): Promise<WorldcupSessionDetail | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("menu_worldcup_sessions")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("status", "IN_PROGRESS")
    .maybeSingle();

  if (!data) {
    return null;
  }
  return loadSessionDetail(data.id, employeeId);
}

export type CreateWorldcupSessionResult =
  | { status: "created"; session: WorldcupSessionDetail }
  | { status: "not_enough_candidates" };

export async function createWorldcupSession(
  employeeId: string,
  gameType: WorldcupGameType = "MENU"
): Promise<CreateWorldcupSessionResult> {
  const supabase = createServiceRoleClient();

  // 새로 시작하면 기존 진행 중 세션은 포기 처리한다.
  await supabase
    .from("menu_worldcup_sessions")
    .update({ status: "ABANDONED", abandoned_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("employee_id", employeeId)
    .eq("status", "IN_PROGRESS");

  const pool = gameType === "RESTAURANT" ? await fetchWorldcupRestaurantPool() : await fetchWorldcupMenuPool();
  const selected = selectCandidatesWithCaps(shuffle(pool), {
    targetSize: 8,
    // 식당 월드컵은 후보 자체가 식당 1개당 1개라 이 상한이 사실상 항상 만족된다.
    maxPerRestaurant: gameType === "RESTAURANT" ? 1 : MAX_MENUS_PER_RESTAURANT,
    maxPerCategory: MAX_MENUS_PER_CATEGORY,
  });

  const tournamentSize = resolveTournamentSize(selected.length);
  if (tournamentSize === null) {
    return { status: "not_enough_candidates" };
  }

  const candidates = selected.slice(0, tournamentSize);

  const { data: sessionRow, error: sessionError } = await supabase
    .from("menu_worldcup_sessions")
    .insert({
      employee_id: employeeId,
      status: "IN_PROGRESS",
      game_type: gameType,
      tournament_size: tournamentSize,
      current_round: 1,
      candidate_snapshot: candidates,
    })
    .select("id, employee_id, status, game_type, tournament_size, current_round, candidate_snapshot, winner_menu_key")
    .single();

  if (sessionError || !sessionRow) {
    throw new Error(`월드컵 세션 생성에 실패했습니다: ${sessionError?.message}`);
  }

  const firstRoundPairings = buildFirstRoundMatches(candidates.map((c) => c.menuKey));
  const { error: matchesError } = await supabase.from("menu_worldcup_matches").insert(
    firstRoundPairings.map((pairing) => ({
      session_id: sessionRow.id,
      round_number: 1,
      match_index: pairing.matchIndex,
      left_menu_key: pairing.leftMenuKey,
      right_menu_key: pairing.rightMenuKey,
    }))
  );

  if (matchesError) {
    throw new Error(`월드컵 대진 생성에 실패했습니다: ${matchesError.message}`);
  }

  const detail = await loadSessionDetail(sessionRow.id, employeeId);
  if (!detail) {
    throw new Error("월드컵 세션 생성 직후 조회에 실패했습니다.");
  }

  return { status: "created", session: detail };
}

export type SelectWorldcupMatchResult =
  | { status: "updated"; session: WorldcupSessionDetail }
  | { status: "not_found" }
  | { status: "invalid_selection" };

export async function selectWorldcupMatch(
  sessionId: string,
  employeeId: string,
  matchId: string,
  selectedMenuKey: string
): Promise<SelectWorldcupMatchResult> {
  const supabase = createServiceRoleClient();

  const { data: session } = await supabase
    .from("menu_worldcup_sessions")
    .select("id, employee_id, status, game_type, tournament_size, current_round, candidate_snapshot, winner_menu_key")
    .eq("id", sessionId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (!session || session.status !== "IN_PROGRESS") {
    return { status: "not_found" };
  }

  const { data: match } = await supabase
    .from("menu_worldcup_matches")
    .select("id, round_number, match_index, left_menu_key, right_menu_key, selected_menu_key")
    .eq("id", matchId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!match || match.round_number !== session.current_round) {
    return { status: "not_found" };
  }

  if (match.selected_menu_key === null) {
    if (selectedMenuKey !== match.left_menu_key && selectedMenuKey !== match.right_menu_key) {
      return { status: "invalid_selection" };
    }

    // 동일 요청 재전송으로 두 번 갱신되지 않도록 아직 선택되지 않은 경우에만 갱신한다.
    await supabase
      .from("menu_worldcup_matches")
      .update({ selected_menu_key: selectedMenuKey, selected_at: new Date().toISOString() })
      .eq("id", matchId)
      .is("selected_menu_key", null);
  }

  const { data: roundMatches } = await supabase
    .from("menu_worldcup_matches")
    .select("match_index, selected_menu_key")
    .eq("session_id", sessionId)
    .eq("round_number", session.current_round);

  const winners = extractRoundWinnersIfComplete(
    (roundMatches ?? []).map((m) => ({ matchIndex: m.match_index, selectedMenuKey: m.selected_menu_key }))
  );

  if (winners === null) {
    const detail = await loadSessionDetail(sessionId, employeeId);
    return detail ? { status: "updated", session: detail } : { status: "not_found" };
  }

  const nextRoundPairings = buildNextRoundMatches(winners);

  if (nextRoundPairings === null) {
    // 우승 메뉴 결정.
    const winnerMenuKey = winners[0];
    const winnerSnapshot = (session.candidate_snapshot as WorldcupCandidate[]).find((c) => c.menuKey === winnerMenuKey) ?? null;
    const now = new Date().toISOString();

    await supabase
      .from("menu_worldcup_sessions")
      .update({
        status: "COMPLETED",
        winner_menu_key: winnerMenuKey,
        winner_menu_snapshot: winnerSnapshot,
        completed_at: now,
        updated_at: now,
      })
      .eq("id", sessionId)
      .eq("status", "IN_PROGRESS");

    await recordAchievementEvent({
      employeeId,
      eventType: "WORLDCUP_COMPLETED",
      eventKey: `WORLDCUP_COMPLETED:${sessionId}`,
      referenceType: "menu_worldcup_session",
      referenceId: sessionId,
    });
  } else {
    const nextRound = session.current_round + 1;
    await supabase.from("menu_worldcup_matches").insert(
      nextRoundPairings.map((pairing) => ({
        session_id: sessionId,
        round_number: nextRound,
        match_index: pairing.matchIndex,
        left_menu_key: pairing.leftMenuKey,
        right_menu_key: pairing.rightMenuKey,
      }))
    );
    await supabase
      .from("menu_worldcup_sessions")
      .update({ current_round: nextRound, updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("status", "IN_PROGRESS");
  }

  const detail = await loadSessionDetail(sessionId, employeeId);
  return detail ? { status: "updated", session: detail } : { status: "not_found" };
}

export async function abandonWorldcupSession(sessionId: string, employeeId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase
    .from("menu_worldcup_sessions")
    .update({ status: "ABANDONED", abandoned_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("employee_id", employeeId)
    .eq("status", "IN_PROGRESS");
}
