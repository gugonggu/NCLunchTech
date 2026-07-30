"use client";

import { useMemo, useState } from "react";
import { createAvatar } from "@dicebear/core";
import { avataaars } from "@dicebear/collection";
import {
  AVATAR_ACCESSORIES_LABELS,
  AVATAR_ACCESSORIES_VALUES,
  AVATAR_COLOR_LABELS,
  AVATAR_DEFAULT_OPTIONS,
  AVATAR_FACIAL_HAIR_LABELS,
  AVATAR_FACIAL_HAIR_VALUES,
  AVATAR_TRAIT_LABELS,
  type AvatarOptions,
  buildDicebearParams,
} from "@/lib/avatars/validation";
import { updateAvatar } from "@/app/me/actions";
import { Button } from "@/components/ui/Button";

function TraitSelect({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-ink">
      {label}
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 rounded-control border border-line bg-surface px-3 text-ink"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ColorSwatchField({
  label,
  name,
  value,
  colors,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  colors: { hex: string; label: string }[];
  onChange: (hex: string) => void;
}) {
  return (
    <fieldset className="grid gap-1">
      <legend className="text-sm font-semibold text-ink">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <button
            key={color.hex}
            type="button"
            aria-label={color.label}
            aria-pressed={value === color.hex}
            onClick={() => onChange(color.hex)}
            className={`h-8 w-8 rounded-full border-2 ${value === color.hex ? "border-brand" : "border-line"}`}
            style={{ backgroundColor: `#${color.hex}` }}
          />
        ))}
      </div>
      <input type="hidden" name={name} value={value} />
    </fieldset>
  );
}

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
        <TraitSelect
          label="머리 스타일"
          name="top"
          value={options.top}
          onChange={(value) => updateField("top", value)}
          options={Object.entries(AVATAR_TRAIT_LABELS.top).map(([value, label]) => ({ value, label }))}
        />

        <ColorSwatchField
          label="머리색"
          name="hairColor"
          value={options.hairColor}
          onChange={(value) => updateField("hairColor", value)}
          colors={Object.entries(AVATAR_COLOR_LABELS.hairColor).map(([hex, label]) => ({ hex, label }))}
        />

        <ColorSwatchField
          label="피부색"
          name="skinColor"
          value={options.skinColor}
          onChange={(value) => updateField("skinColor", value)}
          colors={Object.entries(AVATAR_COLOR_LABELS.skinColor).map(([hex, label]) => ({ hex, label }))}
        />

        <TraitSelect
          label="눈"
          name="eyes"
          value={options.eyes}
          onChange={(value) => updateField("eyes", value)}
          options={Object.entries(AVATAR_TRAIT_LABELS.eyes).map(([value, label]) => ({ value, label }))}
        />

        <TraitSelect
          label="입"
          name="mouth"
          value={options.mouth}
          onChange={(value) => updateField("mouth", value)}
          options={Object.entries(AVATAR_TRAIT_LABELS.mouth).map(([value, label]) => ({ value, label }))}
        />

        <TraitSelect
          label="옷 스타일"
          name="clothing"
          value={options.clothing}
          onChange={(value) => updateField("clothing", value)}
          options={Object.entries(AVATAR_TRAIT_LABELS.clothing).map(([value, label]) => ({ value, label }))}
        />

        <ColorSwatchField
          label="옷 색"
          name="clothesColor"
          value={options.clothesColor}
          onChange={(value) => updateField("clothesColor", value)}
          colors={Object.entries(AVATAR_COLOR_LABELS.clothesColor).map(([hex, label]) => ({ hex, label }))}
        />

        <TraitSelect
          label="안경 등 액세서리"
          name="accessories"
          value={options.accessories}
          onChange={(value) => updateField("accessories", value)}
          options={[{ value: "none", label: "없음" }, ...AVATAR_ACCESSORIES_VALUES.map((value) => ({ value, label: AVATAR_ACCESSORIES_LABELS[value] }))]}
        />

        <TraitSelect
          label="수염"
          name="facialHair"
          value={options.facialHair}
          onChange={(value) => updateField("facialHair", value)}
          options={[{ value: "none", label: "없음" }, ...AVATAR_FACIAL_HAIR_VALUES.map((value) => ({ value, label: AVATAR_FACIAL_HAIR_LABELS[value] }))]}
        />

        <Button type="submit">아바타 저장</Button>
      </form>
    </div>
  );
}
