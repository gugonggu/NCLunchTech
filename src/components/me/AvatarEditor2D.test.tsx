// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/me/actions", () => ({ updateAvatar: vi.fn() }));

import { AvatarEditor2D } from "./AvatarEditor2D";
import { AVATAR_COLOR_LABELS, AVATAR_DEFAULT_OPTIONS, AVATAR_TRAIT_LABELS } from "@/lib/avatars/validation";

describe("AvatarEditor2D", () => {
  it("renders a select for every customizable enum trait with a Korean label chosen", () => {
    render(<AvatarEditor2D initialOptions={AVATAR_DEFAULT_OPTIONS} />);
    const topSelect = screen.getByLabelText("머리 스타일") as HTMLSelectElement;
    expect(topSelect.value).toBe(AVATAR_DEFAULT_OPTIONS.top);
    expect(screen.getByText(AVATAR_TRAIT_LABELS.top[AVATAR_DEFAULT_OPTIONS.top])).toBeInTheDocument();
  });

  it("renders a select for eyebrows with a Korean label chosen", () => {
    render(<AvatarEditor2D initialOptions={AVATAR_DEFAULT_OPTIONS} />);
    const eyebrowsSelect = screen.getByLabelText("눈썹") as HTMLSelectElement;
    expect(eyebrowsSelect.value).toBe(AVATAR_DEFAULT_OPTIONS.eyebrows);
    expect(screen.getByText(AVATAR_TRAIT_LABELS.eyebrows[AVATAR_DEFAULT_OPTIONS.eyebrows])).toBeInTheDocument();
  });

  it("falls back to the default options when nothing is saved yet", () => {
    render(<AvatarEditor2D initialOptions={null} />);
    const clothingSelect = screen.getByLabelText("옷 스타일") as HTMLSelectElement;
    expect(clothingSelect.value).toBe(AVATAR_DEFAULT_OPTIONS.clothing);
  });

  it("renders a color swatch button per option, marking the current color as pressed", () => {
    render(<AvatarEditor2D initialOptions={AVATAR_DEFAULT_OPTIONS} />);
    const group = screen.getByRole("group", { name: "옷 색" });
    const currentLabel = AVATAR_COLOR_LABELS.clothesColor[AVATAR_DEFAULT_OPTIONS.clothesColor];
    const currentSwatch = within(group).getByRole("button", { name: currentLabel });
    expect(currentSwatch).toHaveAttribute("aria-pressed", "true");
  });

  it("updates the live preview image when a color swatch is clicked", () => {
    render(<AvatarEditor2D initialOptions={AVATAR_DEFAULT_OPTIONS} />);
    const preview = screen.getByAltText("아바타 미리보기") as HTMLImageElement;
    const before = preview.src;

    const group = screen.getByRole("group", { name: "옷 색" });
    fireEvent.click(within(group).getByRole("button", { name: AVATAR_COLOR_LABELS.clothesColor["ff5c5c"] }));

    expect((screen.getByAltText("아바타 미리보기") as HTMLImageElement).src).not.toBe(before);
  });
});
