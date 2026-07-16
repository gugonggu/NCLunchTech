// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("renders the service name and pre-login notice", () => {
    render(<HomePage />);

    expect(screen.getByText("앤시점심기술")).toBeInTheDocument();
    expect(
      screen.getByText("로그인 기능은 다음 단계에서 추가될 예정입니다.")
    ).toBeInTheDocument();
  });
});
