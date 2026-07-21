// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("returnTo=%2Frecommend"),
}));

import LoginPage from "./page";

describe("LoginPage", () => {
  it("uses visible labels and preserves the signup return path", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText("닉네임")).toBeRequired();
    expect(screen.getByLabelText("PIN 4자리")).toHaveAttribute(
      "inputmode",
      "numeric",
    );
    expect(screen.getByRole("link", { name: "회원가입" })).toHaveAttribute(
      "href",
      "/signup?returnTo=%2Frecommend",
    );
  });
});
