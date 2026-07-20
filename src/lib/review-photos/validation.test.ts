import { describe, expect, it } from "vitest";
import { buildPhotoStoragePath, isAllowedPhotoMimeType, isReviewPhotoStatusCode } from "./validation";

describe("isAllowedPhotoMimeType", () => {
  it("jpeg/png/webp만 허용한다", () => {
    expect(isAllowedPhotoMimeType("image/jpeg")).toBe(true);
    expect(isAllowedPhotoMimeType("image/png")).toBe(true);
    expect(isAllowedPhotoMimeType("image/webp")).toBe(true);
  });

  it("그 외 타입은 거부한다", () => {
    expect(isAllowedPhotoMimeType("image/gif")).toBe(false);
    expect(isAllowedPhotoMimeType("application/pdf")).toBe(false);
    expect(isAllowedPhotoMimeType("")).toBe(false);
  });
});

describe("buildPhotoStoragePath", () => {
  it("리뷰 id 폴더 아래 uuid.확장자 형태로 만든다(사용자 파일명 미사용)", () => {
    expect(buildPhotoStoragePath("review-1", "image/jpeg", "abc-123")).toBe("review-1/abc-123.jpg");
    expect(buildPhotoStoragePath("review-1", "image/png", "abc-123")).toBe("review-1/abc-123.png");
    expect(buildPhotoStoragePath("review-1", "image/webp", "abc-123")).toBe("review-1/abc-123.webp");
  });
});

describe("isReviewPhotoStatusCode", () => {
  it("허용 목록에 있는 값만 통과한다", () => {
    expect(isReviewPhotoStatusCode("uploaded")).toBe(true);
    expect(isReviewPhotoStatusCode("아무거나")).toBe(false);
    expect(isReviewPhotoStatusCode(undefined)).toBe(false);
  });
});
