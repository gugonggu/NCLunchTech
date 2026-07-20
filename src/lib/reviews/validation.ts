import { z } from "zod";

export type RevisitIntent = "again" | "maybe" | "no";

/** 리뷰 평가 태그 고정 목록(최대 6개). 자유 입력 대신 이 목록에서만 고를 수 있다. */
export const REVIEW_TAGS = [
  "빨리 나와요",
  "가성비 좋아요",
  "양이 많아요",
  "혼밥하기 좋아요",
  "여러 명이 가기 좋아요",
  "다시 가고 싶어요",
] as const;

export type ReviewTag = (typeof REVIEW_TAGS)[number];

const requiredRating = z.coerce.number().int().min(1, "1~5점 사이여야 합니다.").max(5, "1~5점 사이여야 합니다.");
const optionalRating = z.coerce
  .number()
  .int()
  .min(1, "1~5점 사이여야 합니다.")
  .max(5, "1~5점 사이여야 합니다.")
  .optional();

export const reviewSchema = z.object({
  tasteRating: requiredRating,
  speedRating: requiredRating,
  priceRating: requiredRating,
  soloFitRating: requiredRating,
  revisitIntent: z.enum(["again", "maybe", "no"]),
  portionRating: optionalRating,
  crowdednessRating: optionalRating,
  groupFitRating: optionalRating,
  cleanlinessRating: optionalRating,
  tags: z.array(z.enum(REVIEW_TAGS)).max(REVIEW_TAGS.length).optional(),
  oneLineReview: z
    .string()
    .trim()
    .max(200, "한 줄 후기는 200자 이하여야 합니다.")
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

/** 체크박스로 전달된 태그 값을 고정 목록으로만 걸러 중복 없이 정리한다. */
export function parseTagList(raw: FormDataEntryValue[]): ReviewTag[] {
  const seen = new Set<ReviewTag>();
  const result: ReviewTag[] = [];
  for (const value of raw) {
    const tag = String(value) as ReviewTag;
    if ((REVIEW_TAGS as readonly string[]).includes(tag) && !seen.has(tag)) {
      seen.add(tag);
      result.push(tag);
    }
  }
  return result;
}

function cleanOptionalNumber(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  return value;
}

/** 리뷰 폼(FormData)을 reviewSchema 입력 형태로 정리한다(빈 문자열 선택 필드는 undefined로). */
export function normalizeReviewFormData(formData: FormData) {
  return {
    tasteRating: formData.get("tasteRating"),
    speedRating: formData.get("speedRating"),
    priceRating: formData.get("priceRating"),
    soloFitRating: formData.get("soloFitRating"),
    revisitIntent: formData.get("revisitIntent"),
    portionRating: cleanOptionalNumber(formData.get("portionRating")),
    crowdednessRating: cleanOptionalNumber(formData.get("crowdednessRating")),
    groupFitRating: cleanOptionalNumber(formData.get("groupFitRating")),
    cleanlinessRating: cleanOptionalNumber(formData.get("cleanlinessRating")),
    tags: parseTagList(formData.getAll("tags")),
    oneLineReview: formData.get("oneLineReview"),
  };
}

/** 리뷰 화면(?reviewStatus=)에 전달되는 안내 문구. 허용 목록에 없는 값은 화면에 표시하지 않는다. */
export const REVIEW_STATUS_MESSAGES = {
  saved: "리뷰를 저장했어요.",
  invalid_input: "입력값을 다시 확인해주세요.",
  not_visited: "방문한 적 있는 식당만 리뷰를 남길 수 있어요.",
  not_found: "존재하지 않는 식당이에요.",
} as const;

export type ReviewStatusCode = keyof typeof REVIEW_STATUS_MESSAGES;

export function isReviewStatusCode(value: string | undefined): value is ReviewStatusCode {
  return !!value && Object.prototype.hasOwnProperty.call(REVIEW_STATUS_MESSAGES, value);
}

/** 추천 엔진 2.0(2-7)에서 "직원 평가 좋은 곳"/"빨리 나오는 곳" 신호로 인정하는 기준. */
export const GOOD_RATING_THRESHOLD = 4.0;
export const MIN_REVIEWS_FOR_RATING_SIGNAL = 2;
/** 태그가 "많이 언급됐다"고 보는 최소 건수. */
export const MIN_TAG_MENTIONS_FOR_SIGNAL = 2;

export interface ReviewAggregateRow {
  restaurantId: string;
  tasteRating: number;
  speedRating: number;
  priceRating: number;
  soloFitRating: number;
  tags: string[] | null;
}

export interface ReviewAggregate {
  avgOverall: number;
  avgSpeed: number;
  reviewCount: number;
  /** 2건 이상 언급된 태그 중 가장 많이 언급된 것(없으면 null). */
  topTag: string | null;
}

/** 여러 식당의 리뷰 원본 행을 식당별로 집계한다(평균 평점, 최다 언급 태그). DB 접근이 없는 순수 함수. */
export function aggregateReviewRows(rows: ReviewAggregateRow[]): Map<string, ReviewAggregate> {
  const grouped = new Map<
    string,
    { overallSum: number; speedSum: number; count: number; tagCounts: Map<string, number> }
  >();

  for (const row of rows) {
    const entry = grouped.get(row.restaurantId) ?? {
      overallSum: 0,
      speedSum: 0,
      count: 0,
      tagCounts: new Map<string, number>(),
    };
    entry.overallSum += (row.tasteRating + row.speedRating + row.priceRating + row.soloFitRating) / 4;
    entry.speedSum += row.speedRating;
    entry.count += 1;
    for (const tag of row.tags ?? []) {
      entry.tagCounts.set(tag, (entry.tagCounts.get(tag) ?? 0) + 1);
    }
    grouped.set(row.restaurantId, entry);
  }

  const result = new Map<string, ReviewAggregate>();
  for (const [restaurantId, entry] of grouped) {
    let topTag: string | null = null;
    let topCount = 0;
    for (const [tag, count] of entry.tagCounts) {
      if (count > topCount) {
        topTag = tag;
        topCount = count;
      }
    }

    result.set(restaurantId, {
      avgOverall: entry.overallSum / entry.count,
      avgSpeed: entry.speedSum / entry.count,
      reviewCount: entry.count,
      topTag: topCount >= MIN_TAG_MENTIONS_FOR_SIGNAL ? topTag : null,
    });
  }
  return result;
}

export function hasGoodRatingSignal(aggregate: ReviewAggregate | undefined): boolean {
  return (
    !!aggregate && aggregate.reviewCount >= MIN_REVIEWS_FOR_RATING_SIGNAL && aggregate.avgOverall >= GOOD_RATING_THRESHOLD
  );
}

export function hasFastServiceSignal(aggregate: ReviewAggregate | undefined): boolean {
  return (
    !!aggregate && aggregate.reviewCount >= MIN_REVIEWS_FOR_RATING_SIGNAL && aggregate.avgSpeed >= GOOD_RATING_THRESHOLD
  );
}
