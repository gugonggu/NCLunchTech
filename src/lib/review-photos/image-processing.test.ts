import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processPhotoBuffer } from "./image-processing";

async function makeTestImage(width: number, height: number, withExif: boolean) {
  const image = sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 100, b: 50 } },
  }).jpeg();

  if (withExif) {
    image.withExifMerge({
      IFD0: { Make: "TestCam" },
      GPSInfo: { GPSLatitude: "37/1 33/1 0/1", GPSLatitudeRef: "N" },
    } as any);
  }

  return image.toBuffer();
}

describe("processPhotoBuffer", () => {
  it("작은 이미지는 확대하지 않고 그대로 둔다(비율 유지)", async () => {
    const original = await makeTestImage(400, 300, false);
    const processed = await processPhotoBuffer(original, "image/jpeg");
    const meta = await sharp(processed).metadata();
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(300);
  });

  it("긴 변이 1600px를 넘으면 1600px 이하로 축소한다(비율 유지)", async () => {
    const original = await makeTestImage(3200, 1600, false);
    const processed = await processPhotoBuffer(original, "image/jpeg");
    const meta = await sharp(processed).metadata();
    expect(meta.width).toBeLessThanOrEqual(1600);
    expect(meta.height).toBeLessThanOrEqual(1600);
    expect(meta.width! / meta.height!).toBeCloseTo(3200 / 1600, 1);
  });

  it("EXIF(GPS 포함) 메타데이터를 제거한다", async () => {
    const original = await makeTestImage(800, 600, true);
    const originalMeta = await sharp(original).metadata();
    expect(originalMeta.exif).toBeDefined();

    const processed = await processPhotoBuffer(original, "image/jpeg");
    const processedMeta = await sharp(processed).metadata();
    expect(processedMeta.exif).toBeUndefined();
  });

  it("mimeType에 맞는 포맷으로 재인코딩한다", async () => {
    const original = await makeTestImage(100, 100, false);
    const png = await processPhotoBuffer(original, "image/png");
    const webp = await processPhotoBuffer(original, "image/webp");

    expect((await sharp(png).metadata()).format).toBe("png");
    expect((await sharp(webp).metadata()).format).toBe("webp");
  });
});
