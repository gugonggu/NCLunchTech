import "server-only";
import { RESTAURANT_CATEGORIES } from "@/lib/restaurants/constants";
import { fetchWorldcupMenuPool } from "./pool-queries";
import type { WorldcupCandidate } from "./candidates";

const PAGE_SIZE = 20;

export interface WorldcupMenuSearchParams {
  q?: string;
  category?: string;
  page?: string;
}

export type WorldcupMenuSearchState =
  | { status: "ready"; items: WorldcupCandidate[]; totalCount: number; page: number; totalPages: number }
  | { status: "empty" };

/** 커스텀 월드컵 담기 화면에서 메뉴를 이름/분류로 검색한다(월드컵 후보 풀 재사용, 페이지네이션은 메모리에서 처리). */
export async function searchWorldcupMenus(raw: WorldcupMenuSearchParams): Promise<WorldcupMenuSearchState> {
  const q = (raw.q ?? "").trim().toLowerCase();
  const category = (RESTAURANT_CATEGORIES as readonly string[]).includes(raw.category ?? "") ? raw.category! : "";
  const page = Math.max(1, Number(raw.page) || 1);

  const pool = await fetchWorldcupMenuPool();
  const filtered = pool
    .filter((item) => (category ? item.categoryId === category : true))
    .filter((item) => (q ? item.name.toLowerCase().includes(q) : true))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  if (filtered.length === 0) {
    return { status: "empty" };
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, totalPages);
  const items = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return { status: "ready", items, totalCount: filtered.length, page: safePage, totalPages };
}
