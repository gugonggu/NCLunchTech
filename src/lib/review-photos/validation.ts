export const REVIEW_PHOTOS_BUCKET = "review-photos";
export const MAX_PHOTOS_PER_REVIEW = 3;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_RESIZE_MAX_DIMENSION = 1600;

/** 사용자가 올린 원본 파일명을 신뢰하지 않고, 허용된 MIME 타입에서 확장자를 유도한다. */
export const ALLOWED_PHOTO_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isAllowedPhotoMimeType(mimeType: string): mimeType is keyof typeof ALLOWED_PHOTO_MIME_TO_EXT {
  return Object.prototype.hasOwnProperty.call(ALLOWED_PHOTO_MIME_TO_EXT, mimeType);
}

/** 리뷰별 폴더에 UUID 파일명으로 저장한다(사용자 입력 파일명을 전혀 사용하지 않음). */
export function buildPhotoStoragePath(reviewId: string, mimeType: string, uuid: string): string {
  const ext = ALLOWED_PHOTO_MIME_TO_EXT[mimeType];
  return `${reviewId}/${uuid}.${ext}`;
}

export const REVIEW_PHOTO_MESSAGES = {
  uploaded: "사진을 등록했어요.",
  deleted: "사진을 삭제했어요.",
  too_many: `사진은 리뷰당 최대 ${MAX_PHOTOS_PER_REVIEW}장까지 등록할 수 있어요.`,
  invalid_type: "JPEG, PNG, WebP 파일만 등록할 수 있어요.",
  too_large: "사진은 5MB 이하만 등록할 수 있어요.",
  no_file: "사진 파일을 선택해주세요.",
  not_author: "본인이 작성한 리뷰에만 사진을 등록할 수 있어요.",
  not_found: "존재하지 않는 사진이에요.",
} as const;

export type ReviewPhotoStatusCode = keyof typeof REVIEW_PHOTO_MESSAGES;

export function isReviewPhotoStatusCode(value: string | undefined): value is ReviewPhotoStatusCode {
  return !!value && Object.prototype.hasOwnProperty.call(REVIEW_PHOTO_MESSAGES, value);
}
