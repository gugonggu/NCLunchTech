// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getCurrentEmployee: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/visits/queries", () => ({
  getActiveVisitToday: vi.fn(),
}));

vi.mock("@/app/visits/actions", () => ({
  cancelTodayVisit: vi.fn(),
  completeTodayVisit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { company_lat: 35.17, company_lng: 129.13 } }),
        }),
      }),
    }),
  })),
}));

import { getCurrentEmployee } from "@/lib/auth/session";
import { getActiveVisitToday } from "@/lib/visits/queries";
import HomePage from "./page";

function renderHome(searchParams: Record<string, string> = {}) {
  return HomePage({ searchParams: Promise.resolve(searchParams) });
}

describe("HomePage", () => {
  it("비로그인 상태에서는 로그인·회원가입 버튼을 보여준다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue(null);

    const ui = await renderHome();
    render(ui);

    expect(screen.getByText("앤시점심기술")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "회원가입" })).toHaveAttribute("href", "/signup");
    expect(screen.queryByText(/식당 찾기/)).not.toBeInTheDocument();
  });

  it("오늘의 결정이 없으면 오늘 뭐 먹지?/식당 찾기 버튼을 보여준다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });
    vi.mocked(getActiveVisitToday).mockResolvedValue(null);

    const ui = await renderHome();
    render(ui);

    expect(screen.getByText("테스트닉네임님, 안녕하세요.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "오늘 뭐 먹지?" })).toHaveAttribute("href", "/recommend");
    expect(screen.getByRole("link", { name: "식당 찾기" })).toHaveAttribute("href", "/restaurants");
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "로그인" })).not.toBeInTheDocument();
  });

  it("planned 방문이 있으면 오늘의 점심 카드와 변경·취소·완료 동작을 보여준다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });
    vi.mocked(getActiveVisitToday).mockResolvedValue({
      id: "visit-1",
      restaurantId: "r-1",
      status: "planned",
      restaurantName: "테스트식당",
      restaurantCategory: "한식",
      restaurantLat: 35.171,
      restaurantLng: 129.131,
    });

    const ui = await renderHome();
    render(ui);

    expect(screen.getByText("오늘의 점심")).toBeInTheDocument();
    expect(screen.getByText("테스트식당")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "변경하기" })).toHaveAttribute("href", "/recommend");
    expect(screen.getByRole("button", { name: "결정 취소" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "방문 완료" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "오늘 뭐 먹지?" })).not.toBeInTheDocument();
  });

  it("completed 방문이 있으면 완료 표시만 보여주고 재완료 버튼은 없다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });
    vi.mocked(getActiveVisitToday).mockResolvedValue({
      id: "visit-1",
      restaurantId: "r-1",
      status: "completed",
      restaurantName: "테스트식당",
      restaurantCategory: "한식",
      restaurantLat: 35.171,
      restaurantLng: 129.131,
    });

    const ui = await renderHome();
    render(ui);

    expect(screen.getByText("오늘 다녀온 식당")).toBeInTheDocument();
    expect(screen.getByText("방문 완료")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "방문 완료" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "결정 취소" })).not.toBeInTheDocument();
  });

  it("허용 목록에 있는 visitStatus만 안내 문구로 보여준다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });
    vi.mocked(getActiveVisitToday).mockResolvedValue(null);

    const ui = await renderHome({ visitStatus: "decided" });
    render(ui);

    expect(screen.getByText("오늘의 점심으로 결정했어요.")).toBeInTheDocument();
  });

  it("허용 목록에 없는 visitStatus 값은 그대로 표시하지 않는다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });
    vi.mocked(getActiveVisitToday).mockResolvedValue(null);

    const ui = await renderHome({ visitStatus: "<script>alert(1)</script>" });
    render(ui);

    expect(screen.queryByText(/script/)).not.toBeInTheDocument();
  });
});
