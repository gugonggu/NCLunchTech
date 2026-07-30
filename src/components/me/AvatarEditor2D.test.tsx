// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/me/actions", () => ({ updateAvatar: vi.fn() }));

import { AvatarEditor2D } from "./AvatarEditor2D";
import { AVATAR_DEFAULT_OPTIONS } from "@/lib/avatars/validation";

describe("AvatarEditor2D", () => {
  it("renders a select for every customizable trait with the current value chosen", () => {
    render(<AvatarEditor2D initialOptions={AVATAR_DEFAULT_OPTIONS} />);
    const topSelect = screen.getByLabelText("머리 스타일") as HTMLSelectElement;
    expect(topSelect.value).toBe(AVATAR_DEFAULT_OPTIONS.top);
  });

  it("falls back to the default options when nothing is saved yet", () => {
    render(<AvatarEditor2D initialOptions={null} />);
    const clothingSelect = screen.getByLabelText("옷 스타일") as HTMLSelectElement;
    expect(clothingSelect.value).toBe(AVATAR_DEFAULT_OPTIONS.clothing);
  });

  it("updates the live preview image when a trait changes", () => {
    render(<AvatarEditor2D initialOptions={AVATAR_DEFAULT_OPTIONS} />);
    const preview = screen.getByAltText("아바타 미리보기") as HTMLImageElement;
    const before = preview.src;

    fireEvent.change(screen.getByLabelText("옷 색"), { target: { value: "ff5c5c" } });

    expect((screen.getByAltText("아바타 미리보기") as HTMLImageElement).src).not.toBe(before);
  });
});
