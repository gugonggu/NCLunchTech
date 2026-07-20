import "server-only";
import sharp from "sharp";
import { PHOTO_RESIZE_MAX_DIMENSION } from "./validation";

/**
 * 업로드된 이미지를 최대 1600px(긴 변 기준)로 축소하고 재인코딩한다.
 * sharp는 출력 시 원본 메타데이터(EXIF 포함 GPS 위치정보)를 기본적으로 버리므로,
 * 별도 처리 없이 재인코딩만으로 EXIF가 제거된다. rotate()는 EXIF Orientation을
 * 실제 픽셀 회전에 반영한 뒤 메타데이터를 버리므로, 메타데이터 제거 후에도
 * 사진이 옆으로 눕는 문제가 생기지 않는다.
 */
export async function processPhotoBuffer(buffer: Buffer, mimeType: string): Promise<Buffer> {
  const resized = sharp(buffer)
    .rotate()
    .resize({
      width: PHOTO_RESIZE_MAX_DIMENSION,
      height: PHOTO_RESIZE_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    });

  if (mimeType === "image/png") {
    return resized.png().toBuffer();
  }
  if (mimeType === "image/webp") {
    return resized.webp().toBuffer();
  }
  return resized.jpeg().toBuffer();
}
