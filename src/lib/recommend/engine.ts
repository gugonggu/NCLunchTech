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
}

export interface RecommendConditions {
  restaurantName?: string;
  menuName?: string;
  category?: string;
  maxPriceWon?: number;
}

export function filterByRadius(
  candidates: RecommendCandidate[],
  radiusM: number
): RecommendCandidate[] {
  return candidates.filter((c) => c.distanceM <= radiusM);
}

export function filterCandidates(
  candidates: RecommendCandidate[],
  conditions: RecommendConditions
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

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export interface PickOptions {
  excludeIds?: string[];
  random?: () => number;
}

export interface RecommendResult {
  main: RecommendCandidate | null;
  alternatives: RecommendCandidate[];
  wasExclusionReset: boolean;
}

/**
 * 후보 풀에서 메인 1곳 + 대안 최대 2곳을 뽑는다.
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

  const shuffled = shuffle(pool, random);

  return {
    main: shuffled[0],
    alternatives: shuffled.slice(1, 3),
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
