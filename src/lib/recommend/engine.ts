export interface CandidateMenuItem {
  name: string;
  price: number | null;
}

export interface RecommendCandidate {
  id: string;
  name: string;
  category: string;
  distanceM: number;
  isActive: boolean;
  menuItems: CandidateMenuItem[];
  /** 신선한 최신 영업 상태가 "완전 제외 대상"(조기 마감·재료 소진·임시 휴무)이면 그 값, 없으면 null. */
  excludingBusinessStatus?: string | null;
  /** 신선한 최신 혼잡도가 '혼잡'이면 true. */
  isFreshlyCongested?: boolean;
}

export interface RecommendConditions {
  restaurantName?: string;
  menuName?: string;
  category?: string;
  maxPriceWon?: number;
  excludeRecentVisits?: boolean;
  excludeCongested?: boolean;
}

/** 최근 방문으로 간주하는 기간(일). 확정 기획에 수치가 없어 잡은 권장 기본값 — 조정 시 이 값만 바꾸면 된다. */
export const RECENT_VISIT_WINDOW_DAYS = 14;
/** 최근 방문 식당의 추천 가중치(1이 기본, 이 값이 낮을수록 덜 뽑힘). */
export const RECENT_VISIT_WEIGHT = 0.2;

export function filterByRadius(
  candidates: RecommendCandidate[],
  radiusM: number
): RecommendCandidate[] {
  return candidates.filter((c) => c.distanceM <= radiusM);
}

/** restaurantId → 마지막 완료 방문이 며칠 전이었는지. 방문 기록이 없으면 값이 없다. */
export type RecentVisitDaysMap = Map<string, number>;

export function filterCandidates(
  candidates: RecommendCandidate[],
  conditions: RecommendConditions,
  recentVisitDays?: RecentVisitDaysMap
): RecommendCandidate[] {
  return candidates.filter((c) => {
    if (!c.isActive) {
      return false;
    }

    if (conditions.restaurantName && !c.name.includes(conditions.restaurantName)) {
      return false;
    }

    if (
      conditions.menuName &&
      !c.menuItems.some((m) => m.name.includes(conditions.menuName as string))
    ) {
      return false;
    }

    if (conditions.category && c.category !== conditions.category) {
      return false;
    }

    if (
      conditions.maxPriceWon !== undefined &&
      !c.menuItems.some((m) => m.price !== null && m.price <= (conditions.maxPriceWon as number))
    ) {
      return false;
    }

    if (conditions.excludeRecentVisits && recentVisitDays) {
      const daysAgo = recentVisitDays.get(c.id);
      if (daysAgo !== undefined && daysAgo < RECENT_VISIT_WINDOW_DAYS) {
        return false;
      }
    }

    // 조기 마감·재료 소진·임시 휴무가 신선하게 제보된 식당은 조건과 무관하게 항상 제외한다.
    if (c.excludingBusinessStatus) {
      return false;
    }

    // 혼잡도는 "혼잡한 곳 제외"를 선택했을 때만 완전 제외한다(선택 안 하면 가중치 감점은 2-7에서 처리).
    if (conditions.excludeCongested && c.isFreshlyCongested) {
      return false;
    }

    return true;
  });
}

function dedupeById(candidates: RecommendCandidate[]): RecommendCandidate[] {
  const seen = new Set<string>();
  const result: RecommendCandidate[] = [];
  for (const c of candidates) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      result.push(c);
    }
  }
  return result;
}

function getWeight(candidateId: string, recentVisitDays?: RecentVisitDaysMap): number {
  if (!recentVisitDays) {
    return 1;
  }
  const daysAgo = recentVisitDays.get(candidateId);
  if (daysAgo !== undefined && daysAgo < RECENT_VISIT_WINDOW_DAYS) {
    return RECENT_VISIT_WEIGHT;
  }
  return 1;
}

/** 가중치 누적합에서 random()*총합이 떨어지는 위치의 인덱스를 고른다. */
function weightedPickIndex(weights: number[], random: () => number): number {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      return i;
    }
  }
  return weights.length - 1;
}

export interface PickOptions {
  excludeIds?: string[];
  random?: () => number;
  recentVisitDays?: RecentVisitDaysMap;
}

export interface RecommendResult {
  main: RecommendCandidate | null;
  alternatives: RecommendCandidate[];
  wasExclusionReset: boolean;
}

/**
 * 후보 풀에서 메인 1곳 + 대안 최대 2곳을 가중치 기반 비복원추출로 뽑는다.
 * 최근 방문 식당은 가중치가 낮아 덜 뽑히지만(0이 되지는 않음) 여전히 뽑힐 수 있다.
 * 제외 목록을 적용한 뒤 후보가 하나도 안 남으면(오늘 넘긴 곳뿐이면) 제외를 무시하고 전체 풀에서 다시 뽑는다.
 */
export function pickRecommendation(
  candidates: RecommendCandidate[],
  options: PickOptions = {}
): RecommendResult {
  const random = options.random ?? Math.random;
  const unique = dedupeById(candidates);
  const excludeSet = new Set(options.excludeIds ?? []);

  let pool = unique.filter((c) => !excludeSet.has(c.id));
  let wasExclusionReset = false;

  if (pool.length === 0 && unique.length > 0) {
    pool = unique;
    wasExclusionReset = true;
  }

  if (pool.length === 0) {
    return { main: null, alternatives: [], wasExclusionReset: false };
  }

  const remaining = [...pool];
  const weights = remaining.map((c) => getWeight(c.id, options.recentVisitDays));
  const picks: RecommendCandidate[] = [];

  const pickCount = Math.min(3, remaining.length);
  for (let i = 0; i < pickCount; i++) {
    const idx = weightedPickIndex(weights, random);
    picks.push(remaining[idx]);
    remaining.splice(idx, 1);
    weights.splice(idx, 1);
  }

  return {
    main: picks[0],
    alternatives: picks.slice(1),
    wasExclusionReset,
  };
}

export function buildRecommendReason(
  main: RecommendCandidate,
  conditions: RecommendConditions
): string {
  if (conditions.category) {
    return `선택하신 '${conditions.category}' 분류에서 골라봤어요.`;
  }

  if (conditions.restaurantName || conditions.menuName) {
    return "검색 조건에 맞는 식당이에요.";
  }

  return `회사에서 약 ${main.distanceM}m 거리예요.`;
}
