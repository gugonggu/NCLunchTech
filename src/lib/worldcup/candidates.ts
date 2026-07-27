export type WorldcupTournamentSize = 8 | 4;

export interface MenuPoolEntry {
  menuKey: string;
  name: string;
  categoryId: string;
  restaurantId: string;
}

export interface WorldcupCandidate {
  menuKey: string;
  name: string;
  categoryId: string;
  /** 이 메뉴를 파는 식당 id 목록(중복 제거). 결과 화면에서 식당을 추천할 때 쓴다.
   * 식당 월드컵에서는 항상 이 후보 자신의 식당 id 하나만 담긴다. */
  restaurantIds: string[];
  /** 이하는 식당 월드컵 카드 표시용(메뉴 월드컵에서는 비워둔다). */
  photoUrl?: string | null;
  distanceM?: number;
  representativeMenuName?: string | null;
  representativeMenuPrice?: number | null;
}

/** 메뉴 이름을 비교 가능한 형태로 정규화한다(같은 메뉴가 중복 출전하지 않도록). */
export function normalizeMenuName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

/** 같은 정규화 이름을 가진 메뉴를 하나로 합친다. 대표 이름/카테고리는 먼저 나온 항목을 쓴다. */
export function dedupeMenuPool(entries: MenuPoolEntry[]): WorldcupCandidate[] {
  const byKey = new Map<string, WorldcupCandidate>();

  for (const entry of entries) {
    const existing = byKey.get(entry.menuKey);
    if (!existing) {
      byKey.set(entry.menuKey, {
        menuKey: entry.menuKey,
        name: entry.name,
        categoryId: entry.categoryId,
        restaurantIds: [entry.restaurantId],
      });
      continue;
    }
    if (!existing.restaurantIds.includes(entry.restaurantId)) {
      existing.restaurantIds.push(entry.restaurantId);
    }
  }

  return [...byKey.values()];
}

export interface SelectWithCapsOptions {
  targetSize: number;
  maxPerRestaurant: number;
  maxPerCategory: number;
}

/**
 * 이미 뒤섞인(shuffled) 순서를 그대로 순회하며, 식당·카테고리 상한을 넘지 않는 선에서
 * targetSize개까지 뽑는다(순수 함수 — 무작위성은 호출 쪽에서 순서로만 주입).
 * 대표 식당(첫 등장 식당) 기준으로 상한을 계산한다.
 */
export function selectCandidatesWithCaps(
  shuffledPool: WorldcupCandidate[],
  options: SelectWithCapsOptions
): WorldcupCandidate[] {
  const restaurantCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const selected: WorldcupCandidate[] = [];

  for (const candidate of shuffledPool) {
    if (selected.length >= options.targetSize) {
      break;
    }

    const representativeRestaurantId = candidate.restaurantIds[0];
    const restaurantCount = restaurantCounts.get(representativeRestaurantId) ?? 0;
    const categoryCount = categoryCounts.get(candidate.categoryId) ?? 0;

    if (restaurantCount >= options.maxPerRestaurant || categoryCount >= options.maxPerCategory) {
      continue;
    }

    selected.push(candidate);
    restaurantCounts.set(representativeRestaurantId, restaurantCount + 1);
    categoryCounts.set(candidate.categoryId, categoryCount + 1);
  }

  return selected;
}

/** 선택된 후보 수로 몇 강(8강/4강) 토너먼트를 시작할 수 있는지 판정한다. 4개 미만이면 시작 불가(null). */
export function resolveTournamentSize(candidateCount: number): WorldcupTournamentSize | null {
  if (candidateCount >= 8) return 8;
  if (candidateCount >= 4) return 4;
  return null;
}
