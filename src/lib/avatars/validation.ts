export type AvatarTraitKey = "top" | "hairColor" | "skinColor" | "eyes" | "mouth" | "clothing" | "clothesColor";

export interface AvatarOptions {
  top: string;
  hairColor: string;
  skinColor: string;
  eyes: string;
  mouth: string;
  clothing: string;
  clothesColor: string;
  accessories: string;
  facialHair: string;
}

export const AVATAR_TRAIT_VALUES: Record<AvatarTraitKey, readonly string[]> = {
  top: [
    "hat", "hijab", "turban", "winterHat1", "winterHat02", "winterHat03", "winterHat04",
    "bob", "bun", "curly", "curvy", "dreads", "frida", "fro", "froBand", "longButNotTooLong",
    "miaWallace", "shavedSides", "straight02", "straight01", "straightAndStrand", "dreads01",
    "dreads02", "frizzle", "shaggy", "shaggyMullet", "shortCurly", "shortFlat", "shortRound",
    "shortWaved", "sides", "theCaesar", "theCaesarAndSidePart", "bigHair",
  ],
  hairColor: ["a55728", "2c1b18", "b58143", "d6b370", "724133", "4a312c", "f59797", "ecdcbf", "c93305", "e8e1e1"],
  skinColor: ["614335", "d08b5b", "ae5d29", "edb98a", "ffdbb4", "fd9841", "f8d25c"],
  eyes: ["closed", "cry", "default", "eyeRoll", "happy", "hearts", "side", "squint", "surprised", "winkWacky", "wink", "xDizzy"],
  mouth: ["concerned", "default", "disbelief", "eating", "grimace", "sad", "screamOpen", "serious", "smile", "tongue", "twinkle", "vomit"],
  clothing: ["blazerAndShirt", "blazerAndSweater", "collarAndSweater", "graphicShirt", "hoodie", "overall", "shirtCrewNeck", "shirtScoopNeck", "shirtVNeck"],
  clothesColor: ["262e33", "65c9ff", "5199e4", "25557c", "e6e6e6", "929598", "3c4f5c", "b1e2ff", "a7ffc4", "ffafb9", "ffffb1", "ff488e", "ff5c5c", "ffffff"],
};

/** "없음"을 고를 수 있는 두 트레잇의 실제 DiceBear enum(선택 안 함은 별도로 "none"으로 표현한다). */
export const AVATAR_ACCESSORIES_VALUES: readonly string[] = [
  "kurt", "prescription01", "prescription02", "round", "sunglasses", "wayfarers", "eyepatch",
];
export const AVATAR_FACIAL_HAIR_VALUES: readonly string[] = [
  "beardLight", "beardMajestic", "beardMedium", "moustacheFancy", "moustacheMagnum",
];

export const AVATAR_DEFAULT_OPTIONS: AvatarOptions = {
  top: "shortFlat",
  hairColor: "2c1b18",
  skinColor: "edb98a",
  eyes: "default",
  mouth: "default",
  clothing: "shirtCrewNeck",
  clothesColor: "3c4f5c",
  accessories: "none",
  facialHair: "none",
};

export function isValidAvatarOptions(value: unknown): value is AvatarOptions {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;

  for (const key of Object.keys(AVATAR_TRAIT_VALUES) as AvatarTraitKey[]) {
    const traitValue = record[key];
    if (typeof traitValue !== "string" || !AVATAR_TRAIT_VALUES[key].includes(traitValue)) {
      return false;
    }
  }

  if (record.accessories !== "none" && !AVATAR_ACCESSORIES_VALUES.includes(record.accessories as string)) {
    return false;
  }
  if (record.facialHair !== "none" && !AVATAR_FACIAL_HAIR_VALUES.includes(record.facialHair as string)) {
    return false;
  }

  return true;
}

/** DiceBear avataaars 스타일에 넘길 파라미터로 변환한다. 선택하지 않은 트레잇(귀걸이 색 등)은 고정 시드로 결정되게 둔다. */
export function buildDicebearParams(options: AvatarOptions): Record<string, unknown> {
  return {
    seed: "nclunchtech-avatar",
    top: [options.top],
    hairColor: [options.hairColor],
    skinColor: [options.skinColor],
    eyes: [options.eyes],
    mouth: [options.mouth],
    clothing: [options.clothing],
    clothesColor: [options.clothesColor],
    accessories: options.accessories === "none" ? [] : [options.accessories],
    accessoriesProbability: options.accessories === "none" ? 0 : 100,
    facialHair: options.facialHair === "none" ? [] : [options.facialHair],
    facialHairProbability: options.facialHair === "none" ? 0 : 100,
    backgroundColor: ["fff4e8"],
  };
}

export const AVATAR_STATUS_MESSAGES = {
  avatar_updated: "아바타를 저장했어요.",
  avatar_preview_pending: "아바타를 저장했지만 미리보기 이미지 생성에는 실패했어요. 잠시 후 다시 저장해보세요.",
  avatar_invalid: "선택할 수 없는 옵션이에요.",
} as const;

export function isAvatarStatusCode(value: string | undefined): value is keyof typeof AVATAR_STATUS_MESSAGES {
  return !!value && Object.prototype.hasOwnProperty.call(AVATAR_STATUS_MESSAGES, value);
}
