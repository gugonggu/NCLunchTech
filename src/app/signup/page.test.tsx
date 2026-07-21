// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("returnTo=%2Frecommend"),
}));

import SignupPage from "./page";

describe("SignupPage", () => {
  it("uses visible labels and preserves the login return path", () => {
    render(<SignupPage />);

    expect(screen.getByLabelText("초대코드")).toBeRequired();
    expect(screen.getByLabelText("닉네임")).toBeRequired();
    expect(screen.getByLabelText("PIN 4자리")).toHaveAttribute(
      "inputmode",
      "numeric",
    );
    expect(screen.getByLabelText("PIN 확인")).toHaveAttribute(
      "maxlength",
      "4",
    );
    expect(screen.getByRole("button", { name: "가입하기" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login?returnTo=%2Frecommend",
    );
  });
});
