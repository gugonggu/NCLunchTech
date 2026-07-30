"use client";

import { useMemo, useState } from "react";
import { createAvatar } from "@dicebear/core";
import { avataaars } from "@dicebear/collection";
import {
  AVATAR_ACCESSORIES_VALUES,
  AVATAR_DEFAULT_OPTIONS,
  AVATAR_FACIAL_HAIR_VALUES,
  AVATAR_TRAIT_VALUES,
  buildDicebearParams,
  type AvatarOptions,
} from "@/lib/avatars/validation";
import { updateAvatar } from "@/app/me/actions";
import { Button } from "@/components/ui/Button";

const TRAIT_LABELS: Record<keyof typeof AVATAR_TRAIT_VALUES, string> = {
  top: "머리 스타일",
  hairColor: "머리색",
  skinColor: "피부색",
  eyes: "눈",
  mouth: "입",
  clothing: "옷 스타일",
  clothesColor: "옷 색",
};

export function AvatarEditor2D({ initialOptions }: { initialOptions: AvatarOptions | null }) {
  const [options, setOptions] = useState<AvatarOptions>(initialOptions ?? AVATAR_DEFAULT_OPTIONS);

  const previewDataUri = useMemo(() => {
    return createAvatar(avataaars, buildDicebearParams(options)).toDataUri();
  }, [options]);

  function updateField<K extends keyof AvatarOptions>(key: K, value: string) {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={previewDataUri} alt="아바타 미리보기" width={128} height={128} className="mx-auto rounded-full border border-line" />

      <form action={updateAvatar} className="flex flex-col gap-3">
        {(Object.keys(AVATAR_TRAIT_VALUES) as (keyof typeof AVATAR_TRAIT_VALUES)[]).map((key) => (
          <label key={key} className="grid gap-1 text-sm font-semibold text-ink">
            {TRAIT_LABELS[key]}
            <select
              name={key}
              value={options[key]}
              onChange={(e) => updateField(key, e.target.value)}
              className="min-h-11 rounded-control border border-line bg-surface px-3 text-ink"
            >
              {AVATAR_TRAIT_VALUES[key].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        ))}

        <label className="grid gap-1 text-sm font-semibold text-ink">
          안경 등 액세서리
          <select
            name="accessories"
            value={options.accessories}
            onChange={(e) => updateField("accessories", e.target.value)}
            className="min-h-11 rounded-control border border-line bg-surface px-3 text-ink"
          >
            <option value="none">없음</option>
            {AVATAR_ACCESSORIES_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm font-semibold text-ink">
          수염
          <select
            name="facialHair"
            value={options.facialHair}
            onChange={(e) => updateField("facialHair", e.target.value)}
            className="min-h-11 rounded-control border border-line bg-surface px-3 text-ink"
          >
            <option value="none">없음</option>
            {AVATAR_FACIAL_HAIR_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <Button type="submit">아바타 저장</Button>
      </form>
    </div>
  );
}
