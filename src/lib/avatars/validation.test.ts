import { describe, expect, it } from "vitest";
import {
  AVATAR_ACCESSORIES_LABELS,
  AVATAR_ACCESSORIES_VALUES,
  AVATAR_COLOR_LABELS,
  AVATAR_DEFAULT_OPTIONS,
  AVATAR_FACIAL_HAIR_LABELS,
  AVATAR_FACIAL_HAIR_VALUES,
  AVATAR_TRAIT_LABELS,
  AVATAR_TRAIT_VALUES,
  buildDicebearParams,
  isValidAvatarOptions,
} from "./validation";

describe("isValidAvatarOptions", () => {
  it("accepts the default options", () => {
    expect(isValidAvatarOptions(AVATAR_DEFAULT_OPTIONS)).toBe(true);
  });

  it("accepts accessories and facialHair set to a real DiceBear value", () => {
    expect(
      isValidAvatarOptions({ ...AVATAR_DEFAULT_OPTIONS, accessories: "round", facialHair: "beardLight" }),
    ).toBe(true);
  });

  it("rejects an unknown trait value", () => {
    expect(isValidAvatarOptions({ ...AVATAR_DEFAULT_OPTIONS, top: "not-a-real-style" })).toBe(false);
  });

  it("rejects a partial object missing a required field", () => {
    const { top: _top, ...partial } = AVATAR_DEFAULT_OPTIONS;
    expect(isValidAvatarOptions(partial)).toBe(false);
  });

  it("rejects non-object input", () => {
    expect(isValidAvatarOptions(null)).toBe(false);
    expect(isValidAvatarOptions("top")).toBe(false);
  });
});

describe("buildDicebearParams", () => {
  it("wraps every chosen trait in a single-value array and fixes the background color", () => {
    const params = buildDicebearParams(AVATAR_DEFAULT_OPTIONS);
    expect(params).toMatchObject({
      top: [AVATAR_DEFAULT_OPTIONS.top],
      hairColor: [AVATAR_DEFAULT_OPTIONS.hairColor],
      skinColor: [AVATAR_DEFAULT_OPTIONS.skinColor],
      eyes: [AVATAR_DEFAULT_OPTIONS.eyes],
      mouth: [AVATAR_DEFAULT_OPTIONS.mouth],
      clothing: [AVATAR_DEFAULT_OPTIONS.clothing],
      clothesColor: [AVATAR_DEFAULT_OPTIONS.clothesColor],
      backgroundColor: ["fff4e8"],
      accessoriesProbability: 0,
      facialHairProbability: 0,
    });
  });

  it("turns on accessories/facialHair probability when a real value is chosen", () => {
    const params = buildDicebearParams({ ...AVATAR_DEFAULT_OPTIONS, accessories: "round", facialHair: "beardLight" });
    expect(params).toMatchObject({
      accessories: ["round"],
      accessoriesProbability: 100,
      facialHair: ["beardLight"],
      facialHairProbability: 100,
    });
  });
});

describe("avatar labels", () => {
  it("has a Korean label for every top/eyes/mouth/clothing value", () => {
    for (const key of ["top", "eyes", "mouth", "clothing"] as const) {
      for (const value of AVATAR_TRAIT_VALUES[key]) {
        expect(AVATAR_TRAIT_LABELS[key][value], `${key}.${value}`).toBeTypeOf("string");
      }
    }
  });

  it("has a Korean label for every accessories/facialHair value", () => {
    for (const value of AVATAR_ACCESSORIES_VALUES) {
      expect(AVATAR_ACCESSORIES_LABELS[value], value).toBeTypeOf("string");
    }
    for (const value of AVATAR_FACIAL_HAIR_VALUES) {
      expect(AVATAR_FACIAL_HAIR_LABELS[value], value).toBeTypeOf("string");
    }
  });

  it("has a Korean color name for every hairColor/skinColor/clothesColor value", () => {
    for (const key of ["hairColor", "skinColor", "clothesColor"] as const) {
      for (const value of AVATAR_TRAIT_VALUES[key]) {
        expect(AVATAR_COLOR_LABELS[key][value], `${key}.${value}`).toBeTypeOf("string");
      }
    }
  });
});
