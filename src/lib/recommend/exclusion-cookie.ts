import "server-only";
import { cookies } from "next/headers";

export const EXCLUSION_COOKIE_NAME = "nc_recommend_excluded";
export const MAX_EXCLUSION_ENTRIES = 50;

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const exclusionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/** 저장된 쿠키 값을 안전하게 해석한다. 형식이 깨져 있으면 예외를 던지지 않고 빈 목록으로 취급한다. */
export function parseExclusionList(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of parsed) {
    if (typeof item === "string" && UUID_PATTERN.test(item) && !seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

/**
 * 제외 목록에 식당 하나를 추가한다.
 * - UUID 형식이 아니면 목록을 그대로 반환한다(안전한 no-op).
 * - 이미 있는 항목이면 맨 뒤로 옮긴다(가장 최근 제외로 취급).
 * - 50개를 초과하면 가장 오래된 항목부터 제거한다(용량 초과 시 정상 동작).
 */
export function addExclusion(list: string[], restaurantId: string): string[] {
  if (!UUID_PATTERN.test(restaurantId)) {
    return list;
  }

  const updated = [...list.filter((id) => id !== restaurantId), restaurantId];

  if (updated.length > MAX_EXCLUSION_ENTRIES) {
    return updated.slice(updated.length - MAX_EXCLUSION_ENTRIES);
  }

  return updated;
}

/** 쿠키에 남아있는 제외 id 중, 현재 후보 목록에 실제로 존재하는 것만 남긴다. */
export function intersectWithCandidates(excludedIds: string[], candidateIds: string[]): string[] {
  const candidateSet = new Set(candidateIds);
  return excludedIds.filter((id) => candidateSet.has(id));
}

/** Asia/Seoul(UTC+9, 서머타임 없음) 기준 다음 자정에 해당하는 UTC 시각을 계산한다. */
export function nextSeoulMidnight(now: Date): Date {
  const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;
  const seoulNow = new Date(now.getTime() + SEOUL_OFFSET_MS);
  const seoulNextMidnight = Date.UTC(
    seoulNow.getUTCFullYear(),
    seoulNow.getUTCMonth(),
    seoulNow.getUTCDate() + 1,
    0,
    0,
    0,
    0
  );
  return new Date(seoulNextMidnight - SEOUL_OFFSET_MS);
}

export async function getExclusionList(): Promise<string[]> {
  const cookieStore = await cookies();
  return parseExclusionList(cookieStore.get(EXCLUSION_COOKIE_NAME)?.value);
}

export async function setExclusionList(list: string[]): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(EXCLUSION_COOKIE_NAME, JSON.stringify(list), {
    ...exclusionCookieOptions,
    expires: nextSeoulMidnight(new Date()),
  });
}
