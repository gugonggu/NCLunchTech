// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  getAvatarPreviewUrls: vi.fn(),
  getMonthlyLeaderHistory: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServiceRoleClient: mocks.createServiceRoleClient }));
vi.mock("@/lib/avatars/queries", () => ({
  DEFAULT_AVATAR_IMAGE_PATH: "/avatar-default.png",
  getAvatarPreviewUrls: mocks.getAvatarPreviewUrls,
}));
vi.mock("@/lib/monthly-leaders/queries", () => ({ getMonthlyLeaderHistory: mocks.getMonthlyLeaderHistory }));

import EmployeeProfilePage from "./page";

afterEach(() => vi.resetAllMocks());

describe("EmployeeProfilePage", () => {
  it("shows the public avatar, nickname, latest badge, and all awarded months without scores", async () => {
    const employeeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "emp-1", nickname: "리더" }, error: null }),
    };
    mocks.createServiceRoleClient.mockReturnValue({ from: vi.fn().mockReturnValue(employeeQuery) });
    mocks.getAvatarPreviewUrls.mockResolvedValue(new Map([["emp-1", "https://avatars.test/emp-1.png"]]));
    mocks.getMonthlyLeaderHistory.mockResolvedValue([{ monthKey: "2026-07-01" }, { monthKey: "2026-06-01" }]);

    render(await EmployeeProfilePage({ params: Promise.resolve({ id: "emp-1" }) }));

    expect(screen.getByRole("heading", { name: "리더" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "리더의 아바타" })).toHaveAttribute("src", "https://avatars.test/emp-1.png");
    expect(screen.getAllByText("2026년 7월 이달의 리더")).toHaveLength(2);
    expect(screen.getByText("2026년 6월 이달의 리더")).toBeInTheDocument();
    expect(screen.queryByText(/점수|score|4/iu)).not.toBeInTheDocument();
  });
});
