// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { FeedbackState } from "./FeedbackState";
import { FormField } from "./FormField";

describe("shared UI", () => {
  it("exposes button variants without losing native attributes", () => {
    render(
      <Button variant="primary" disabled>
        추천 받기
      </Button>,
    );

    expect(screen.getByRole("button", { name: "추천 받기" })).toBeDisabled();
  });

  it("connects labels, hints and errors to fields", () => {
    render(
      <FormField
        label="닉네임"
        htmlFor="nickname"
        hint="사내에서 사용할 이름"
        error="닉네임을 입력해주세요."
      >
        <input id="nickname" aria-invalid="true" />
      </FormField>,
    );

    const input = screen.getByLabelText("닉네임");
    expect(input).toHaveAttribute(
      "aria-describedby",
      "nickname-hint nickname-error",
    );
  });

  it("renders semantic status and actionable empty states", () => {
    render(
      <>
        <Badge tone="success">영업 중</Badge>
        <FeedbackState
          title="방문 기록이 없어요"
          action={<a href="/recommend">추천 받기</a>}
        />
      </>,
    );

    expect(screen.getByText("영업 중")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "추천 받기" })).toHaveAttribute(
      "href",
      "/recommend",
    );
  });
});
