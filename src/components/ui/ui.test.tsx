// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";
import { Button, buttonStyles } from "./Button";
import { Card } from "./Card";
import { cx } from "./cx";
import { FeedbackState } from "./FeedbackState";
import { FormField } from "./FormField";
import { Skeleton } from "./Skeleton";

describe("shared UI", () => {
  it("exposes button variants without losing native attributes", () => {
    render(
      <Button variant="primary" disabled>
        추천 받기
      </Button>,
    );

    expect(screen.getByRole("button", { name: "추천 받기" })).toBeDisabled();
  });

  it("keeps default and compact buttons at accessible click sizes", () => {
    expect(buttonStyles()).toContain("min-h-12");
    expect(buttonStyles({ size: "compact" })).toContain("min-h-11");
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

  it("gives FeedbackState action elements an accessible target without dropping classes", () => {
    render(
      <FeedbackState
        title="방문 기록이 없어요"
        action={
          <a className="existing-action" href="/recommend">
            추천 받기
          </a>
        }
      />
    );

    expect(screen.getByRole("link", { name: "추천 받기" })).toHaveClass(
      "inline-flex",
      "min-h-11",
      "existing-action",
    );
  });

  it("preserves and appends field descriptions", () => {
    render(
      <FormField
        label="닉네임"
        htmlFor="nickname"
        hint="사내에서 사용할 이름"
        error="닉네임을 입력해주세요."
      >
        <input id="nickname" aria-describedby="existing-description" />
      </FormField>,
    );

    expect(screen.getByLabelText("닉네임")).toHaveAttribute(
      "aria-describedby",
      "existing-description nickname-hint nickname-error",
    );
  });

  it("renders error feedback as an alert", () => {
    render(<FeedbackState tone="error" title="불러오지 못했어요" />);

    expect(screen.getByRole("alert")).toHaveTextContent("불러오지 못했어요");
  });

  it("renders card, skeleton and class composition primitives", () => {
    const { container } = render(
      <>
        <Card tone="accent" padding="compact" data-testid="card" />
        <Skeleton data-testid="skeleton" />
      </>,
    );

    expect(screen.getByTestId("card")).toHaveClass("bg-brand-soft", "p-4");
    expect(screen.getByTestId("skeleton")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByTestId("skeleton")).toHaveClass(
      "animate-pulse",
      "motion-reduce:animate-none",
    );
    expect(cx("first", false, null, undefined, "second")).toBe("first second");
    expect(container).toBeInTheDocument();
  });
});
