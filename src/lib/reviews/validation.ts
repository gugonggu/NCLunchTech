import { z } from "zod";

export type RevisitIntent = "again" | "maybe" | "no";

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
  tags: z.array(z.string().trim().min(1)).optional(),
  oneLineReview: z
    .string()
    .trim()
    .max(200, "한 줄 후기는 200자 이하여야 합니다.")
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

/** 쉼표로 구분된 태그 입력을 정리한다(공백 제거, 빈 값·중복 제거). */
export function parseTagList(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(",")) {
    const tag = part.trim();
    if (tag && !seen.has(tag)) {
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
    tags: parseTagList(String(formData.get("tags") ?? "")),
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
