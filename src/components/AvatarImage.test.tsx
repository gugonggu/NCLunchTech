// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AvatarImage } from "./AvatarImage";

describe("AvatarImage", () => {
  it("renders an image with the given preview URL and alt text", () => {
    render(<AvatarImage previewUrl="https://avatars.test/emp-1.png" alt="홍천의 아바타" />);
    const img = screen.getByAltText("홍천의 아바타") as HTMLImageElement;
    expect(img.src).toBe("https://avatars.test/emp-1.png");
  });

  it("applies the requested size", () => {
    render(<AvatarImage previewUrl="https://avatars.test/emp-1.png" alt="홍천의 아바타" size={64} />);
    const img = screen.getByAltText("홍천의 아바타") as HTMLImageElement;
    expect(img.width).toBe(64);
    expect(img.height).toBe(64);
  });
});
