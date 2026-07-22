// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/lunch-availability/actions", () => ({
  clearMyLunchAvailability: vi.fn(),
  setMyLunchAvailability: vi.fn(),
}));

import { LunchAvailabilityCard } from "./LunchAvailabilityCard";

describe("LunchAvailabilityCard", () => {
  it("shows the empty state and all status choices when nobody has shared", () => {
    render(<LunchAvailabilityCard employeeId="me" availabilities={[]} />);

    expect(screen.getByText("아직 오늘의 점심 상태를 공유한 동료가 없어요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "같이 먹을 사람을 구해요" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "외근 또는 점심을 먹지 않아요" })).toBeInTheDocument();
  });

  it("shows every public nickname and counts people looking for company", () => {
    render(
      <LunchAvailabilityCard
        employeeId="me"
        availabilities={[
          { employeeId: "me", nickname: "홍천", status: "looking_for_company" },
          { employeeId: "other", nickname: "나래", status: "has_appointment" },
        ]}
      />,
    );

    expect(screen.getByText("같이 먹을 사람을 구해요 · 1명")).toBeInTheDocument();
    expect(screen.getByText("홍천")).toBeInTheDocument();
    expect(screen.getByText("나래")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "상태 해제" })).toBeInTheDocument();
  });
});
