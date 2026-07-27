export interface WorldcupMatchPairing {
  matchIndex: number;
  leftMenuKey: string;
  rightMenuKey: string;
}

/** 후보 메뉴 순서(8개 또는 4개)를 그대로 순서대로 짝지어 첫 라운드 대진을 만든다. */
export function buildFirstRoundMatches(candidateMenuKeysInOrder: string[]): WorldcupMatchPairing[] {
  const pairings: WorldcupMatchPairing[] = [];
  for (let i = 0; i < candidateMenuKeysInOrder.length; i += 2) {
    pairings.push({
      matchIndex: i / 2,
      leftMenuKey: candidateMenuKeysInOrder[i],
      rightMenuKey: candidateMenuKeysInOrder[i + 1],
    });
  }
  return pairings;
}

/**
 * 이전 라운드의 승자를 match_index 순서대로 받아 다음 라운드 대진을 만든다.
 * 승자가 1명이면 이미 우승자가 결정된 것이므로 null을 반환한다(더 이상 라운드가 없음).
 */
export function buildNextRoundMatches(previousRoundWinnersInOrder: string[]): WorldcupMatchPairing[] | null {
  if (previousRoundWinnersInOrder.length <= 1) {
    return null;
  }
  return buildFirstRoundMatches(previousRoundWinnersInOrder);
}

/** 이번 라운드에 참가하는 메뉴 수를 기준으로 "8강"/"4강"/"결승" 표시 문구를 만든다. */
export function getRoundLabel(currentRound: number, tournamentSize: number): string {
  const playersInRound = tournamentSize / 2 ** (currentRound - 1);
  return playersInRound <= 2 ? "결승" : `${playersInRound}강`;
}

export interface MatchSelectionState {
  matchIndex: number;
  selectedMenuKey: string | null;
}

/** 한 라운드의 모든 경기가 선택됐는지, 그렇다면 승자를 match_index 순서로 반환한다. */
export function extractRoundWinnersIfComplete(matches: MatchSelectionState[]): string[] | null {
  const sorted = [...matches].sort((a, b) => a.matchIndex - b.matchIndex);
  if (sorted.some((m) => m.selectedMenuKey === null)) {
    return null;
  }
  return sorted.map((m) => m.selectedMenuKey as string);
}
