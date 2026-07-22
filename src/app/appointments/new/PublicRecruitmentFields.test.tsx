// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicRecruitmentFields } from "./PublicRecruitmentFields";

describe("PublicRecruitmentFields", () => {
  it("shows the default capacity and hides direct invitations when public recruitment is selected", () => {
    render(<PublicRecruitmentFields />);

    expect(screen.getByLabelText("공개 모집")).not.toBeChecked();
    expect(screen.queryByLabelText("정원")).not.toBeInTheDocument();
    expect(screen.getByLabelText("참여자 닉네임")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("공개 모집"));

    expect(screen.getByLabelText("정원")).toHaveValue(4);
    expect(screen.queryByLabelText("참여자 닉네임")).not.toBeInTheDocument();
  });
});
