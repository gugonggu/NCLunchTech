export type AvatarTraitKey =
  | "top"
  | "eyebrows"
  | "hairColor"
  | "skinColor"
  | "eyes"
  | "mouth"
  | "clothing"
  | "clothesColor";

export interface AvatarOptions {
  top: string;
  eyebrows: string;
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
  eyebrows: [
    "angryNatural", "defaultNatural", "flatNatural", "frownNatural", "raisedExcitedNatural",
    "sadConcernedNatural", "unibrowNatural", "upDownNatural", "angry", "default",
    "raisedExcited", "sadConcerned", "upDown",
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

/** 드롭다운에 DiceBear 원본 값 대신 보여줄 한글 라벨(선택 목록 순서와 무관하게 값으로 조회한다). */
export const AVATAR_TRAIT_LABELS: Record<"top" | "eyebrows" | "eyes" | "mouth" | "clothing", Record<string, string>> = {
  top: {
    hat: "모자", hijab: "히잡", turban: "터번", winterHat1: "겨울모자 1", winterHat02: "겨울모자 2",
    winterHat03: "겨울모자 3", winterHat04: "겨울모자 4", bob: "단발", bun: "쪽머리", curly: "곱슬머리",
    curvy: "웨이브머리", dreads: "드레드락", frida: "리본머리", fro: "아프로", froBand: "아프로밴드",
    longButNotTooLong: "중단발", miaWallace: "단발컷", shavedSides: "옆머리삭발", straight02: "생머리 1",
    straight01: "생머리 2", straightAndStrand: "생머리+브릿지", dreads01: "드레드락 1", dreads02: "드레드락 2",
    frizzle: "곱슬단발", shaggy: "샤기컷", shaggyMullet: "샤기 멀렛", shortCurly: "짧은 곱슬머리",
    shortFlat: "짧은 생머리", shortRound: "짧은 둥근머리", shortWaved: "짧은 웨이브", sides: "옆머리",
    theCaesar: "시저컷", theCaesarAndSidePart: "시저컷+가르마", bigHair: "볼륨머리",
  },
  eyebrows: {
    angryNatural: "자연스러운 화난 눈썹", defaultNatural: "자연스러운 기본 눈썹",
    flatNatural: "자연스러운 일자 눈썹", frownNatural: "자연스러운 찌푸린 눈썹",
    raisedExcitedNatural: "자연스러운 놀란 눈썹", sadConcernedNatural: "자연스러운 걱정스런 눈썹",
    unibrowNatural: "자연스러운 일자연결눈썹", upDownNatural: "자연스러운 짝짝이 눈썹",
    angry: "화난 눈썹", default: "기본 눈썹", raisedExcited: "놀란 눈썹",
    sadConcerned: "걱정스런 눈썹", upDown: "짝짝이 눈썹",
  },
  eyes: {
    closed: "감은 눈", cry: "우는 눈", default: "기본 눈", eyeRoll: "눈 굴림", happy: "웃는 눈",
    hearts: "하트 눈", side: "옆으로 보는 눈", squint: "찡그린 눈", surprised: "놀란 눈",
    winkWacky: "찡긋 윙크", wink: "윙크", xDizzy: "어지러운 눈",
  },
  mouth: {
    concerned: "걱정스런 입", default: "기본 입", disbelief: "당황한 입", eating: "먹는 입",
    grimace: "찡그린 입", sad: "슬픈 입", screamOpen: "비명 입", serious: "진지한 입", smile: "미소",
    tongue: "혀 내민 입", twinkle: "반짝이는 입", vomit: "구토하는 입",
  },
  clothing: {
    blazerAndShirt: "블레이저+셔츠", blazerAndSweater: "블레이저+스웨터", collarAndSweater: "카라+스웨터",
    graphicShirt: "그래픽 티셔츠", hoodie: "후드티", overall: "멜빵바지", shirtCrewNeck: "라운드넥 셔츠",
    shirtScoopNeck: "스쿱넥 셔츠", shirtVNeck: "브이넥 셔츠",
  },
};

export const AVATAR_ACCESSORIES_LABELS: Record<string, string> = {
  kurt: "커트 안경", prescription01: "안경 1", prescription02: "안경 2", round: "둥근 안경",
  sunglasses: "선글라스", wayfarers: "웨이페어러 안경", eyepatch: "안대",
};
export const AVATAR_FACIAL_HAIR_LABELS: Record<string, string> = {
  beardLight: "옅은 수염", beardMajestic: "풍성한 수염", beardMedium: "중간 수염",
  moustacheFancy: "멋진 콧수염", moustacheMagnum: "매그넘 콧수염",
};

/** 색상 트레잇 3종의 hex 값을 스와치 버튼에서 읽어줄 한글 색상명으로 매핑한다. */
export const AVATAR_COLOR_LABELS: Record<"hairColor" | "skinColor" | "clothesColor", Record<string, string>> = {
  hairColor: {
    a55728: "적갈색", "2c1b18": "흑갈색", b58143: "밝은 갈색", d6b370: "금발", "724133": "고동색",
    "4a312c": "다크 브라운", f59797: "핑크", ecdcbf: "애쉬 베이지", c93305: "빨강", e8e1e1: "은발",
  },
  skinColor: {
    "614335": "진한 갈색", d08b5b: "갈색", ae5d29: "적갈색", edb98a: "황갈색", ffdbb4: "연한 베이지",
    fd9841: "주황빛", f8d25c: "밝은 황색",
  },
  clothesColor: {
    "262e33": "검정", "65c9ff": "하늘색", "5199e4": "파랑", "25557c": "남색", e6e6e6: "연회색",
    "929598": "회색", "3c4f5c": "진회색", b1e2ff: "연하늘색", a7ffc4: "연두", ffafb9: "연분홍",
    ffffb1: "연노랑", ff488e: "핑크", ff5c5c: "빨강", ffffff: "흰색",
  },
};

export const AVATAR_DEFAULT_OPTIONS: AvatarOptions = {
  top: "shortFlat",
  eyebrows: "default",
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
    eyebrows: [options.eyebrows],
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
