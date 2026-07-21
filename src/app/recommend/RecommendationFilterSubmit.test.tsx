// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useFormStatusMock } = vi.hoisted(() => ({
  useFormStatusMock: vi.fn(),
}));

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();
  return { ...actual, useFormStatus: useFormStatusMock };
});

import { RecommendationFilterSubmit } from "./RecommendationFilterSubmit";

describe("RecommendationFilterSubmit", () => {
  beforeEach(() => {
    useFormStatusMock.mockReset();
  });

  it("exposes the ready submit contract", () => {
    useFormStatusMock.mockReturnValue({ pending: false });
    render(<RecommendationFilterSubmit />);

    const submit = screen.getByRole("button", { name: "이 조건으로 추천받기" });
    expect(submit).toBeEnabled();
    expect(submit).toHaveAttribute("type", "submit");
    expect(submit).toHaveAttribute("aria-busy", "false");
  });

  it("disables closing-sensitive submission while pending", () => {
    useFormStatusMock.mockReturnValue({ pending: true });
    render(<RecommendationFilterSubmit />);

    const submit = screen.getByRole("button", { name: "추천 조건 적용 중…" });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute("aria-busy", "true");
  });
});
