// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getCurrentEmployee: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { getCurrentEmployee } from "@/lib/auth/session";
import HomePage from "./page";

describe("HomePage", () => {
  it("비로그인 상태에서는 로그인·회원가입 버튼을 보여준다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue(null);

    const ui = await HomePage();
    render(ui);

    expect(screen.getByText("앤시점심기술")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "회원가입" })).toHaveAttribute("href", "/signup");
    expect(screen.queryByText(/식당 찾기/)).not.toBeInTheDocument();
  });

  it("로그인 상태에서는 닉네임과 식당 찾기 링크, 로그아웃 버튼을 보여준다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });

    const ui = await HomePage();
    render(ui);

    expect(screen.getByText("테스트닉네임님, 안녕하세요.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "오늘 뭐 먹지?" })).toHaveAttribute("href", "/recommend");
    expect(screen.getByRole("link", { name: "식당 찾기" })).toHaveAttribute("href", "/restaurants");
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "로그인" })).not.toBeInTheDocument();
  });
});
