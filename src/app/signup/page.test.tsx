// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams("returnTo=%2Frecommend"),
}));

import SignupPage from "./page";

describe("SignupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("makes the login link a 44px touch target", () => {
    render(<SignupPage />);

    expect(screen.getByRole("link", { name: "로그인" })).toHaveClass(
      "inline-flex",
      "min-h-11",
      "min-w-11",
    );
  });

  it("posts signup details and redirects before refreshing after success", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);
    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText("초대코드"), {
      target: { value: "LUNCH" },
    });
    fireEvent.change(screen.getByLabelText("닉네임"), {
      target: { value: "점심이" },
    });
    fireEvent.change(screen.getByLabelText("PIN 4자리"), {
      target: { value: "1234" },
    });
    fireEvent.change(screen.getByLabelText("PIN 확인"), {
      target: { value: "1234" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "가입하기" }).closest("form")!,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: "LUNCH",
          nickname: "점심이",
          pin: "1234",
          pinConfirm: "1234",
        }),
      });
      expect(router.push).toHaveBeenCalledWith("/recommend");
      expect(router.refresh).toHaveBeenCalledOnce();
    });
    expect(router.push).toHaveBeenCalledBefore(router.refresh);
  });

  it("disables the pending submission with the submitting copy", () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<SignupPage />);

    fireEvent.submit(
      screen.getByRole("button", { name: "가입하기" }).closest("form")!,
    );

    expect(screen.getByRole("button", { name: "가입하고 있어요" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "가입하고 있어요" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("renders a failed response message in an alert", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, message: "안전한 오류 메시지" }),
    } as Response);
    render(<SignupPage />);

    fireEvent.submit(
      screen.getByRole("button", { name: "가입하기" }).closest("form")!,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("안전한 오류 메시지");
  });
});
