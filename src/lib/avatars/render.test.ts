import { describe, expect, it } from "vitest";
import { AVATAR_DEFAULT_OPTIONS } from "./validation";
import { renderAvatarPng } from "./render";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("renderAvatarPng", () => {
  it("returns a non-empty PNG buffer", async () => {
    const png = await renderAvatarPng(AVATAR_DEFAULT_OPTIONS);
    expect(png.subarray(0, 8)).toEqual(PNG_SIGNATURE);
    expect(png.length).toBeGreaterThan(0);
  });

  it("is deterministic for the same options", async () => {
    const first = await renderAvatarPng(AVATAR_DEFAULT_OPTIONS);
    const second = await renderAvatarPng(AVATAR_DEFAULT_OPTIONS);
    expect(first).toEqual(second);
  });

  it("produces a different image when a trait changes", async () => {
    const defaultPng = await renderAvatarPng(AVATAR_DEFAULT_OPTIONS);
    const changedPng = await renderAvatarPng({ ...AVATAR_DEFAULT_OPTIONS, clothesColor: "ff5c5c" });
    expect(defaultPng.equals(changedPng)).toBe(false);
  });
});
