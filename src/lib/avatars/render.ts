import "server-only";
import sharp from "sharp";
import { createAvatar } from "@dicebear/core";
import { avataaars } from "@dicebear/collection";
import { buildDicebearParams, type AvatarOptions } from "./validation";

export const AVATAR_PNG_SIZE = 256;

export async function renderAvatarPng(options: AvatarOptions): Promise<Buffer> {
  const avatar = createAvatar(avataaars, buildDicebearParams(options));
  const svg = avatar.toString();
  return sharp(Buffer.from(svg)).resize(AVATAR_PNG_SIZE, AVATAR_PNG_SIZE).png().toBuffer();
}
