// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { CollapsibleSection } from "./CollapsibleSection";

describe("CollapsibleSection", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("is expanded by default and shows its children", () => {
    render(
      <CollapsibleSection storageKey="profile" ariaLabel="프로필 수정" title="프로필" description="설명">
        <p>폼 내용</p>
      </CollapsibleSection>,
    );

    expect(screen.getByText("폼 내용")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /프로필/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("collapses on click, hiding children, and persists the choice to localStorage", () => {
    render(
      <CollapsibleSection storageKey="profile" ariaLabel="프로필 수정" title="프로필" description="설명">
        <p>폼 내용</p>
      </CollapsibleSection>,
    );

    fireEvent.click(screen.getByRole("button", { name: /프로필/ }));

    expect(screen.queryByText("폼 내용")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("me:collapsed:profile")).toBe("true");
  });

  it("starts collapsed when localStorage already has a collapsed value for that key", () => {
    window.localStorage.setItem("me:collapsed:avatar", "true");

    render(
      <CollapsibleSection storageKey="avatar" ariaLabel="아바타" title="아바타" description="설명">
        <p>에디터</p>
      </CollapsibleSection>,
    );

    expect(screen.queryByText("에디터")).not.toBeInTheDocument();
  });

  it("shows the status message even while collapsed", () => {
    window.localStorage.setItem("me:collapsed:profile", "true");

    render(
      <CollapsibleSection
        storageKey="profile"
        ariaLabel="프로필 수정"
        title="프로필"
        description="설명"
        statusMessage="프로필을 저장했어요."
      >
        <p>폼 내용</p>
      </CollapsibleSection>,
    );

    expect(screen.getByText("프로필을 저장했어요.")).toBeInTheDocument();
  });
});
