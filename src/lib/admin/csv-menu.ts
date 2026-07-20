import { parseCsvRows } from "./csv-parse";

export interface RestaurantLookup {
  id: string;
  name: string;
  kakaoPlaceId: string;
}

export interface ExistingMenuItem {
  restaurantId: string;
  name: string;
}

export interface MenuCsvRow {
  rowNumber: number;
  kakaoPlaceId: string;
  name: string;
  price: number | null;
  restaurantId: string | null;
  restaurantName: string | null;
  isNew: boolean;
  errors: string[];
}

export interface MenuCsvParseResult {
  rows: MenuCsvRow[];
  headerValid: boolean;
}

const EXPECTED_HEADER = ["kakao_place_id", "name", "price"];

export function parseMenuCsv(
  text: string,
  restaurants: RestaurantLookup[],
  existingMenuItems: ExistingMenuItem[]
): MenuCsvParseResult {
  const raw = parseCsvRows(text);
  if (raw.length === 0) {
    return { rows: [], headerValid: false };
  }

  const header = raw[0].map((h) => h.trim().toLowerCase());
  const headerValid = header.length === EXPECTED_HEADER.length && EXPECTED_HEADER.every((h, i) => header[i] === h);
  if (!headerValid) {
    return { rows: [], headerValid: false };
  }

  const byKakaoId = new Map(restaurants.map((r) => [r.kakaoPlaceId, r]));
  const existingKeySet = new Set(existingMenuItems.map((m) => `${m.restaurantId}::${m.name}`));
  const seenInFile = new Set<string>();

  const rows: MenuCsvRow[] = raw.slice(1).map((cells, idx) => {
    const rowNumber = idx + 2;
    const kakaoPlaceId = (cells[0] ?? "").trim();
    const name = (cells[1] ?? "").trim();
    const priceRaw = (cells[2] ?? "").trim();
    const errors: string[] = [];

    if (cells.length !== EXPECTED_HEADER.length) {
      errors.push("열 개수가 올바르지 않습니다(3개 필요).");
    }

    if (!kakaoPlaceId) {
      errors.push("kakao_place_id가 비어 있습니다.");
    }
    if (!name) {
      errors.push("name이 비어 있습니다.");
    }

    let price: number | null = null;
    if (priceRaw) {
      const parsed = Number(priceRaw);
      if (!Number.isInteger(parsed) || parsed < 0) {
        errors.push("price는 0 이상의 정수여야 합니다.");
      } else {
        price = parsed;
      }
    }

    const restaurant = kakaoPlaceId ? byKakaoId.get(kakaoPlaceId) : undefined;
    if (kakaoPlaceId && !restaurant) {
      errors.push("등록된 식당의 kakao_place_id가 아닙니다.");
    }

    let isNew = false;
    if (restaurant && name) {
      const key = `${restaurant.id}::${name}`;
      if (seenInFile.has(key)) {
        errors.push("파일 내 중복된 식당·메뉴명입니다.");
      }
      seenInFile.add(key);
      isNew = !existingKeySet.has(key);
    }

    return {
      rowNumber,
      kakaoPlaceId,
      name,
      price,
      restaurantId: restaurant?.id ?? null,
      restaurantName: restaurant?.name ?? null,
      isNew,
      errors,
    };
  });

  return { rows, headerValid: true };
}
