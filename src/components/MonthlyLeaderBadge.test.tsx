// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthlyLeaderBadge } from "./MonthlyLeaderBadge";

describe("MonthlyLeaderBadge", () => {
  it("shows the awarded month without exposing a leaderboard score", () => {
    render(<MonthlyLeaderBadge monthKey="2026-07-01" />);

    expect(screen.getByText("2026년 7월 이달의 리더")).toBeInTheDocument();
    expect(screen.queryByText(/점수|score|4/iu)).not.toBeInTheDocument();
  });
});
