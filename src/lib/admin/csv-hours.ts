import { parseCsvRows } from "./csv-parse";
import type { RestaurantLookup } from "./csv-menu";

export interface ExistingHoursRow {
  restaurantId: string;
  dayOfWeek: number;
}

export interface HoursCsvRow {
  rowNumber: number;
  kakaoPlaceId: string;
  dayOfWeek: number | null;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
  restaurantId: string | null;
  restaurantName: string | null;
  isNew: boolean;
  errors: string[];
}

export interface HoursCsvParseResult {
  rows: HoursCsvRow[];
  headerValid: boolean;
}

const EXPECTED_HEADER = ["kakao_place_id", "day_of_week", "is_closed", "open_time", "close_time"];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseBoolean(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return null;
}

export function parseHoursCsv(
  text: string,
  restaurants: RestaurantLookup[],
  existingHours: ExistingHoursRow[]
): HoursCsvParseResult {
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
  const existingKeySet = new Set(existingHours.map((h) => `${h.restaurantId}::${h.dayOfWeek}`));
  const seenInFile = new Set<string>();

  const rows: HoursCsvRow[] = raw.slice(1).map((cells, idx) => {
    const rowNumber = idx + 2;
    const kakaoPlaceId = (cells[0] ?? "").trim();
    const dayOfWeekRaw = (cells[1] ?? "").trim();
    const isClosedRaw = (cells[2] ?? "").trim();
    const openTimeRaw = (cells[3] ?? "").trim();
    const closeTimeRaw = (cells[4] ?? "").trim();
    const errors: string[] = [];

    if (cells.length !== EXPECTED_HEADER.length) {
      errors.push("열 개수가 올바르지 않습니다(5개 필요).");
    }

    if (!kakaoPlaceId) {
      errors.push("kakao_place_id가 비어 있습니다.");
    }

    let dayOfWeek: number | null = null;
    const dayParsed = Number(dayOfWeekRaw);
    if (!Number.isInteger(dayParsed) || dayParsed < 0 || dayParsed > 6) {
      errors.push("day_of_week는 0~6 사이의 정수여야 합니다.");
    } else {
      dayOfWeek = dayParsed;
    }

    const isClosed = parseBoolean(isClosedRaw);
    if (isClosed === null) {
      errors.push("is_closed는 true/false(또는 1/0)여야 합니다.");
    }

    let openTime: string | null = null;
    let closeTime: string | null = null;
    if (isClosed === true && (openTimeRaw || closeTimeRaw)) {
      errors.push("휴무일에는 open_time과 close_time을 비워야 합니다.");
    } else if (isClosed === false) {
      if (!TIME_PATTERN.test(openTimeRaw)) {
        errors.push("open_time 형식이 올바르지 않습니다(HH:mm).");
      } else {
        openTime = openTimeRaw;
      }
      if (!TIME_PATTERN.test(closeTimeRaw)) {
        errors.push("close_time 형식이 올바르지 않습니다(HH:mm).");
      } else {
        closeTime = closeTimeRaw;
      }
      if (openTime && closeTime && closeTime <= openTime) {
        errors.push("close_time은 open_time보다 늦어야 합니다.");
      }
    }

    const restaurant = kakaoPlaceId ? byKakaoId.get(kakaoPlaceId) : undefined;
    if (kakaoPlaceId && !restaurant) {
      errors.push("등록된 식당의 kakao_place_id가 아닙니다.");
    }

    let isNew = false;
    if (restaurant && dayOfWeek !== null) {
      const key = `${restaurant.id}::${dayOfWeek}`;
      if (seenInFile.has(key)) {
        errors.push("파일 내 중복된 식당·요일 조합입니다.");
      }
      seenInFile.add(key);
      isNew = !existingKeySet.has(key);
    }

    return {
      rowNumber,
      kakaoPlaceId,
      dayOfWeek,
      isClosed: isClosed ?? false,
      openTime,
      closeTime,
      restaurantId: restaurant?.id ?? null,
      restaurantName: restaurant?.name ?? null,
      isNew,
      errors,
    };
  });

  return { rows, headerValid: true };
}
