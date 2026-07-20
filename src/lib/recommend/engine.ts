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
  lat: number;
  lng: number;
  /** 신선한 최신 영업 상태가 "완전 제외 대상"(조기 마감·재료 소진·임시 휴무)이면 그 값, 없으면 null. */
  excludingBusinessStatus?: string | null;
  /** 신선한 최신 혼잡도가 '혼잡'이면 true. */
  isFreshlyCongested?: boolean;
  /** 신선한 최신 혼잡도가 '한산'이면 true(추천 사유 표시용, 가중치에는 영향 없음). */
  isFreshlyQuiet?: boolean;
  /** 이 직원이 즐겨찾기했는지. */
  isFavorite?: boolean;
  /** 리뷰 2건 이상 + 평균 4.0점 이상. */
  hasGoodRatingSignal?: boolean;
  /** 리뷰 2건 이상 + 속도 평점 평균 4.0점 이상. */
  hasFastServiceSignal?: boolean;
  /** 2건 이상 언급된 리뷰 태그 중 최다 언급(없으면 null/undefined). */
  topReviewTag?: string | null;
  /** 이 직원이 전체 기간 한 번도 방문한 적 없는지. */
  isUnvisitedByMe?: boolean;
  /** 회사 전체에서 아무도 방문한 적 없는지(신규 개업 여부와는 무관 — 단순 미방문 사실만). */
  isGloballyUnvisited?: boolean;
}

export interface RecommendConditions {
  restaurantName?: string;
  menuName?: string;
  category?: string;
  maxPriceWon?: number;
  excludeRecentVisits?: boolean;
  excludeCongested?: boolean;
  /** 이하는 완전 배제가 아니라 가중치를 높이는 "우선" 조건(선택 안 하면 기존과 동일하게 동작). */
  preferFavorites?: boolean;
  preferGoodRating?: boolean;
  preferFast?: boolean;
  preferUnvisited?: boolean;
}

/** 최근 방문으로 간주하는 기간(일). 확정 기획에 수치가 없어 잡은 권장 기본값 — 조정 시 이 값만 바꾸면 된다. */
export const RECENT_VISIT_WINDOW_DAYS = 14;
/** 최근 방문 식당의 추천 가중치(1이 기본, 이 값이 낮을수록 덜 뽑힘). */
export const RECENT_VISIT_WEIGHT = 0.2;
/** 신선한 '혼잡' 제보가 있는 식당의 추천 가중치(완전 제외가 아니라 감점만, 2-3에서 미룬 부분). */
export const CONGESTION_WEIGHT = 0.5;
/** "우선" 조건 하나가 만족될 때마다 곱해지는 가중치 배수. 여러 개 만족하면 곱해서 누적된다. */
export const PREFERENCE_BOOST = 2;
/** 여러 감점·배수가 겹쳐도 극단으로 치우치지 않도록 최종 가중치를 이 범위로 자른다. */
export const MIN_WEIGHT = 0.05;
export const MAX_WEIGHT = 6;

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

/**
 * 후보 하나의 추천 가중치를 계산한다: 최근 방문·혼잡 제보는 감점(곱셈), "우선" 조건은 배수로 가점(곱셈).
 * 여러 요인이 겹쳐도 극단으로 치우치지 않도록 [MIN_WEIGHT, MAX_WEIGHT]로 자른다.
 */
export function getWeight(
  candidate: RecommendCandidate,
  conditions: RecommendConditions = {},
  recentVisitDays?: RecentVisitDaysMap
): number {
  let weight = 1;

  const daysAgo = recentVisitDays?.get(candidate.id);
  if (daysAgo !== undefined && daysAgo < RECENT_VISIT_WINDOW_DAYS) {
    weight *= RECENT_VISIT_WEIGHT;
  }

  if (candidate.isFreshlyCongested) {
    weight *= CONGESTION_WEIGHT;
  }

  if (conditions.preferFavorites && candidate.isFavorite) {
    weight *= PREFERENCE_BOOST;
  }
  if (conditions.preferGoodRating && candidate.hasGoodRatingSignal) {
    weight *= PREFERENCE_BOOST;
  }
  if (conditions.preferFast && candidate.hasFastServiceSignal) {
    weight *= PREFERENCE_BOOST;
  }
  if (conditions.preferUnvisited && candidate.isUnvisitedByMe) {
    weight *= PREFERENCE_BOOST;
  }

  return Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, weight));
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
  conditions?: RecommendConditions;
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
  const weights = remaining.map((c) => getWeight(c, options.conditions, options.recentVisitDays));
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

/** 사유 최대 개수(카드가 지저분해지지 않도록 상위 우선순위 것만 자른다). */
export const MAX_RECOMMEND_REASONS = 2;

/**
 * 실제 데이터로 뒷받침되는 추천 사유를 우선순위대로 최대 MAX_RECOMMEND_REASONS개 반환한다.
 * 확인 불가능한 정보(가짜 인기·평점 등)는 절대 만들지 않고, 해당 조건이 실제로 충족될 때만 넣는다.
 * 아무 신호도 없으면 항상 거리 문구를 fallback으로 최소 1개는 보장한다.
 */
export function buildRecommendReasons(
  main: RecommendCandidate,
  conditions: RecommendConditions,
  recentVisitDays?: RecentVisitDaysMap
): string[] {
  const reasons: string[] = [];

  if (conditions.category) {
    reasons.push(`선택하신 '${conditions.category}' 분류에서 골라봤어요.`);
  } else if (conditions.restaurantName || conditions.menuName) {
    reasons.push("검색 조건에 맞는 식당이에요.");
  }

  if (main.isFavorite) {
    reasons.push("즐겨찾기한 식당이에요.");
  }

  if (main.hasGoodRatingSignal) {
    reasons.push("직원 평가가 좋아요.");
  }

  if (main.topReviewTag) {
    reasons.push(`'${main.topReviewTag}' 평가가 많아요.`);
  }

  const daysAgo = recentVisitDays?.get(main.id);
  if (daysAgo === undefined || daysAgo >= RECENT_VISIT_WINDOW_DAYS) {
    reasons.push(`최근 ${RECENT_VISIT_WINDOW_DAYS}일 동안 방문하지 않았어요.`);
  }

  if (main.isFreshlyQuiet) {
    reasons.push("지금 한산하다는 제보가 있어요.");
  }

  if (main.isGloballyUnvisited) {
    reasons.push("아직 아무도 방문하지 않은 식당이에요.");
  }

  if (reasons.length === 0) {
    reasons.push(`회사에서 약 ${main.distanceM}m 거리예요.`);
  }

  return reasons.slice(0, MAX_RECOMMEND_REASONS);
}
