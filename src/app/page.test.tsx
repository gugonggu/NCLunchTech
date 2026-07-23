// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
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
  markTodayVisitNoShow: vi.fn(),
}));

vi.mock("@/lib/appointments/queries", () => ({
  getRelevantAppointments: vi.fn(),
  getPublicRecruitingAppointments: vi.fn(),
}));

vi.mock("@/lib/notifications/queries", () => ({
  getUnreadNotificationCount: vi.fn(),
}));

vi.mock("@/lib/meals/queries", () => ({
  getMealRecordForSource: vi.fn(),
}));

vi.mock("@/lib/polls/queries", () => ({
  getRelevantPolls: vi.fn(),
}));

vi.mock("@/lib/lunch-availability/queries", () => ({
  getLunchAvailabilities: vi.fn(),
}));

vi.mock("@/lib/restaurant-of-the-month-queries", () => ({
  getRestaurantOfTheMonth: vi.fn(),
}));

vi.mock("@/lib/reviews/queries", () => ({
  hasMyReview: vi.fn(),
}));

const { mockSettingsMaybeSingle } = vi.hoisted(() => ({
  mockSettingsMaybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockSettingsMaybeSingle,
        }),
      }),
    }),
  })),
}));

import { getCurrentEmployee } from "@/lib/auth/session";
import { getActiveVisitToday } from "@/lib/visits/queries";
import { getPublicRecruitingAppointments, getRelevantAppointments } from "@/lib/appointments/queries";
import { getUnreadNotificationCount } from "@/lib/notifications/queries";
import { getMealRecordForSource } from "@/lib/meals/queries";
import { getRelevantPolls } from "@/lib/polls/queries";
import { getLunchAvailabilities } from "@/lib/lunch-availability/queries";
import { getRestaurantOfTheMonth } from "@/lib/restaurant-of-the-month-queries";
import { hasMyReview } from "@/lib/reviews/queries";
import HomePage from "./page";

function mockDefaults() {
  vi.mocked(getUnreadNotificationCount).mockResolvedValue(0);
  vi.mocked(getMealRecordForSource).mockResolvedValue(null);
  vi.mocked(getRelevantPolls).mockResolvedValue([]);
  vi.mocked(getLunchAvailabilities).mockResolvedValue([]);
  vi.mocked(getPublicRecruitingAppointments).mockResolvedValue([]);
  vi.mocked(getRestaurantOfTheMonth).mockResolvedValue(null);
  vi.mocked(hasMyReview).mockResolvedValue(false);
  mockSettingsMaybeSingle.mockResolvedValue({
    data: { company_lat: 35.17, company_lng: 129.13, announcement: null },
  });
}

function renderHome(searchParams: Record<string, string> = {}) {
  return HomePage({ searchParams: Promise.resolve(searchParams) });
}

describe("HomePage", () => {
  it("adds breathing room below the home content", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "tester" });
    mockDefaults();
    vi.mocked(getActiveVisitToday).mockResolvedValue(null);
    vi.mocked(getRelevantAppointments).mockResolvedValue([]);

    const { container } = render(await renderHome());

    expect(container.querySelector("main")).toHaveClass("pb-6", "sm:pb-8");
  });

  it("이번 달의 식당을 오늘 같이 먹기 아래에 표시한다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트" });
    mockDefaults();
    vi.mocked(getActiveVisitToday).mockResolvedValue(null);
    vi.mocked(getRelevantAppointments).mockResolvedValue([]);
    vi.mocked(getRestaurantOfTheMonth).mockResolvedValue({
      restaurantId: "r-1",
      restaurantName: "복만당",
      restaurantCategory: "중식",
      completedVisitCount: 3,
      averageTasteRating: 4.5,
      latestCompletedAt: "2026-07-15T03:00:00.000Z",
      selectionReason: "most_completed_visits",
    });

    render(await renderHome());

    expect(screen.getByRole("heading", { name: "이번 달의 식당" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /복만당/ })).toHaveAttribute("href", "/restaurants/r-1");
  });

  it("이번 달 완료 방문 후보가 없으면 식당 카드를 숨긴다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트" });
    mockDefaults();
    vi.mocked(getActiveVisitToday).mockResolvedValue(null);
    vi.mocked(getRelevantAppointments).mockResolvedValue([]);

    render(await renderHome());

    expect(screen.queryByRole("heading", { name: "이번 달의 식당" })).not.toBeInTheDocument();
  });

  it("renders public appointments that the employee can apply to", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트" });
    mockDefaults();
    vi.mocked(getActiveVisitToday).mockResolvedValue(null);
    vi.mocked(getRelevantAppointments).mockResolvedValue([]);
    vi.mocked(getPublicRecruitingAppointments).mockResolvedValue([
      {
        id: "public-1",
        restaurantName: "복만당",
        scheduledAt: "2026-07-23T03:30:00.000Z",
        capacity: 4,
        acceptedParticipantCount: 1,
      },
    ]);

    render(await renderHome());

    expect(screen.getByRole("heading", { name: "참여 가능한 동행" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /복만당/ })).toHaveAttribute("href", "/appointments/public-1");
  });

  it("비로그인 상태에서는 로그인·회원가입 버튼을 보여준다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue(null);

    const ui = await renderHome();
    render(ui);

    expect(screen.getByText("앤시점심기술")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "회원가입" })).toHaveAttribute("href", "/signup");
    expect(screen.queryByText(/식당 찾기/)).not.toBeInTheDocument();
  });

  it("오늘의 결정이 없으면 오늘 뭐 먹지?/도감/리더보드 버튼을 보여준다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });
    mockDefaults();
    vi.mocked(getActiveVisitToday).mockResolvedValue(null);
    vi.mocked(getRelevantAppointments).mockResolvedValue([]);

    const ui = await renderHome();
    render(ui);

    expect(screen.getByText("테스트닉네임님, 안녕하세요.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "오늘 뭐 먹지?" })).toHaveAttribute("href", "/recommend");
    expect(screen.getByRole("link", { name: "도감" })).toHaveAttribute("href", "/collection");
    expect(screen.getByRole("link", { name: "리더보드" })).toHaveAttribute("href", "/leaderboard");
    expect(screen.queryByRole("link", { name: "로그인" })).not.toBeInTheDocument();
  });

  it("열린 투표와 오늘의 결정이 함께 있으면 투표를 Hero로 우선한다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });
    mockDefaults();
    vi.mocked(getActiveVisitToday).mockResolvedValue({
      id: "visit-1",
      restaurantId: "r-1",
      status: "planned",
      restaurantName: "테스트식당",
      restaurantCategory: "한식",
      restaurantLat: 35.171,
      restaurantLng: 129.131,
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(getRelevantAppointments).mockResolvedValue([]);
    vi.mocked(getRelevantPolls).mockResolvedValue([
      {
        id: "poll-1",
        pollType: "restaurant",
        label: "오늘 점심 투표",
        status: "open",
        closesAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
      {
        id: "poll-2",
        pollType: "restaurant",
        label: "후보 점심 투표",
        status: "open",
        closesAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      },
    ]);

    const ui = await renderHome();
    render(ui);

    const hero = screen.getByLabelText("오늘 가장 중요한 일");
    expect(within(hero).getByText("방문 확인")).toBeInTheDocument();
    expect(within(hero).queryByRole("link", { name: /오늘 점심 투표/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /오늘 점심 투표/ })).toHaveLength(1);
    expect(screen.getAllByText("오늘 점심 투표")).toHaveLength(1);

    const timeline = screen.getByLabelText("오늘 일정");
    expect(within(timeline).queryByText("오늘의 점심")).not.toBeInTheDocument();
    expect(within(timeline).getByRole("heading", { name: "진행 중인 투표" })).toBeInTheDocument();
  });

  it("열린 투표가 완료 방문보다 우선해도 완료 상세와 리뷰 링크를 일정에 보존한다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });
    mockDefaults();
    vi.mocked(getActiveVisitToday).mockResolvedValue({
      id: "visit-1",
      restaurantId: "r-1",
      status: "completed",
      restaurantName: "테스트식당",
      restaurantCategory: "한식",
      restaurantLat: 35.171,
      restaurantLng: 129.131,
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(getRelevantAppointments).mockResolvedValue([]);
    vi.mocked(getRelevantPolls).mockResolvedValue([
      {
        id: "poll-1",
        pollType: "restaurant",
        label: "오늘 점심 투표",
        status: "open",
        closesAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
    ]);
    vi.mocked(getMealRecordForSource).mockResolvedValue({
      id: "meal-1",
      menuItemId: null,
      menuName: "제육볶음",
      paidPrice: 9500,
    });

    const ui = await renderHome();
    render(ui);

    const hero = screen.getByLabelText("오늘 가장 중요한 일");
    fireEvent.click(within(hero).getByRole("button", { name: "2번째 Hero" }));
    expect(within(hero).getByRole("link", { name: /오늘 점심 투표/ })).toHaveAttribute(
      "href",
      "/polls/poll-1",
    );

    const timeline = screen.getByLabelText("오늘 일정");
    expect(within(timeline).getByText("한식 · 144m")).toBeInTheDocument();
    expect(within(timeline).getByText("제육볶음 · 9,500원")).toBeInTheDocument();
    expect(within(timeline).getByRole("link", { name: "리뷰 남기기" })).toHaveAttribute(
      "href",
      "/reviews/new?restaurantId=r-1&visitId=visit-1",
    );
  });

  it("planned 방문은 즉시 방문 확인 카드로 보여준다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });
    mockDefaults();
    vi.mocked(getActiveVisitToday).mockResolvedValue({
      id: "visit-1",
      restaurantId: "r-1",
      status: "planned",
      restaurantName: "테스트식당",
      restaurantCategory: "한식",
      restaurantLat: 35.171,
      restaurantLng: 129.131,
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(getRelevantAppointments).mockResolvedValue([]);
    const ui = await renderHome();
    render(ui);

    fireEvent.click(screen.getByRole("button", { name: "2번째 Hero" }));

    expect(screen.getByText("방문 확인")).toBeInTheDocument();
    expect(screen.getByText("테스트식당")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "변경하기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "결정 취소" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "오늘 뭐 먹지?" })).not.toBeInTheDocument();
  });

  it("completed 방문이 있으면 완료 표시만 보여주고 재완료 버튼은 없다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });
    mockDefaults();
    vi.mocked(getActiveVisitToday).mockResolvedValue({
      id: "visit-1",
      restaurantId: "r-1",
      status: "completed",
      restaurantName: "테스트식당",
      restaurantCategory: "한식",
      restaurantLat: 35.171,
      restaurantLng: 129.131,
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(getRelevantAppointments).mockResolvedValue([]);
    vi.mocked(getMealRecordForSource).mockResolvedValue({
      id: "meal-1",
      menuItemId: null,
      menuName: "제육볶음",
      paidPrice: 9500,
    });

    const ui = await renderHome();
    render(ui);

    fireEvent.click(screen.getByRole("button", { name: "2번째 Hero" }));

    expect(screen.getByText("방문 완료")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "방문 완료" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "결정 취소" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "3번째 Hero" }));
    expect(screen.getByRole("link", { name: "리뷰 남기기" })).toHaveAttribute(
      "href",
      "/reviews/new?restaurantId=r-1&visitId=visit-1"
    );
  });

  it("결정 후 1시간이 지난 planned 방문은 방문 확인을 우선 노출한다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });
    mockDefaults();
    vi.mocked(getActiveVisitToday).mockResolvedValue({
      id: "visit-1",
      restaurantId: "r-1",
      status: "planned",
      restaurantName: "테스트식당",
      restaurantCategory: "한식",
      restaurantLat: 35.171,
      restaurantLng: 129.131,
      updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });
    vi.mocked(getRelevantAppointments).mockResolvedValue([]);

    const ui = await renderHome();
    render(ui);

    fireEvent.click(screen.getByRole("button", { name: "2번째 Hero" }));

    expect(screen.getByText("방문 확인")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다녀왔어요" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "가지 않았어요" })).toBeInTheDocument();
    expect(screen.queryByText("오늘의 점심")).not.toBeInTheDocument();
  });

  it("허용 목록에 있는 visitStatus만 안내 문구로 보여준다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });
    mockDefaults();
    vi.mocked(getActiveVisitToday).mockResolvedValue(null);
    vi.mocked(getRelevantAppointments).mockResolvedValue([]);

    const ui = await renderHome({ visitStatus: "decided" });
    render(ui);

    expect(screen.getByText("오늘의 점심으로 결정했어요.")).toBeInTheDocument();
  });

  it("허용 목록에 없는 visitStatus 값은 그대로 표시하지 않는다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });
    mockDefaults();
    vi.mocked(getActiveVisitToday).mockResolvedValue(null);
    vi.mocked(getRelevantAppointments).mockResolvedValue([]);

    const ui = await renderHome({ visitStatus: "<script>alert(1)</script>" });
    render(ui);

    expect(screen.queryByText(/script/)).not.toBeInTheDocument();
  });

  it("다가오는 약속이 있으면 목록으로 보여주고, 없으면 섹션 자체를 숨긴다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });
    mockDefaults();
    vi.mocked(getActiveVisitToday).mockResolvedValue(null);
    vi.mocked(getRelevantAppointments).mockResolvedValue([
      {
        id: "appt-1",
        restaurantName: "테스트약속식당",
        scheduledAt: "2026-07-21T03:30:00.000Z",
        role: "host",
        participantStatus: null,
        needsConfirmation: false,
      },
    ]);

    const ui = await renderHome();
    render(ui);

    expect(screen.getByRole("heading", { name: "다가오는 약속" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /테스트약속식당/ })).toHaveAttribute(
      "href",
      "/appointments/appt-1"
    );
  });

  it("다가오는 약속이 없으면 섹션을 숨긴다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });
    mockDefaults();
    vi.mocked(getActiveVisitToday).mockResolvedValue(null);
    vi.mocked(getRelevantAppointments).mockResolvedValue([]);

    const ui = await renderHome();
    render(ui);

    expect(screen.queryByText("다가오는 약속")).not.toBeInTheDocument();
  });

  it("확인 대기 중인 약속이 있으면 방문 확인 섹션에 보여준다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });
    mockDefaults();
    vi.mocked(getActiveVisitToday).mockResolvedValue(null);
    vi.mocked(getRelevantAppointments).mockResolvedValue([
      {
        id: "appt-2",
        restaurantName: "확인대기식당",
        scheduledAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        role: "participant",
        participantStatus: "accepted",
        needsConfirmation: true,
      },
    ]);

    const ui = await renderHome();
    render(ui);

    fireEvent.click(screen.getByRole("button", { name: "2번째 Hero" }));

    expect(screen.getByText("방문 확인")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /확인대기식당/ })).toHaveAttribute(
      "href",
      "/appointments/appt-2"
    );
  });

  it("안 읽은 알림이 있으면 배지를 보여주고, 없으면 숨긴다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });
    mockDefaults();
    vi.mocked(getActiveVisitToday).mockResolvedValue(null);
    vi.mocked(getRelevantAppointments).mockResolvedValue([]);
    vi.mocked(getUnreadNotificationCount).mockResolvedValue(3);

    const ui = await renderHome();
    render(ui);

    expect(screen.getByRole("link", { name: "알림 3건" })).toHaveAttribute("href", "/notifications");
  });

  it("안 읽은 알림이 0건이면 배지를 숨긴다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });
    mockDefaults();
    vi.mocked(getActiveVisitToday).mockResolvedValue(null);
    vi.mocked(getRelevantAppointments).mockResolvedValue([]);

    const ui = await renderHome();
    render(ui);

    expect(screen.queryByRole("link", { name: /알림/ })).not.toBeInTheDocument();
  });

  it("공지사항이 있으면 배너로 보여주고, 없으면 숨긴다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });
    vi.mocked(getActiveVisitToday).mockResolvedValue(null);
    vi.mocked(getRelevantAppointments).mockResolvedValue([]);
    vi.mocked(getUnreadNotificationCount).mockResolvedValue(0);
    mockSettingsMaybeSingle.mockResolvedValue({
      data: { company_lat: 35.17, company_lng: 129.13, announcement: "이번 주 금요일은 회식입니다." },
    });

    const ui = await renderHome();
    render(ui);

    expect(screen.getByText("이번 주 금요일은 회식입니다.")).toBeInTheDocument();
  });

  it("공지사항이 없으면 배너를 숨긴다", async () => {
    vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "테스트닉네임" });
    mockDefaults();
    vi.mocked(getActiveVisitToday).mockResolvedValue(null);
    vi.mocked(getRelevantAppointments).mockResolvedValue([]);

    const ui = await renderHome();
    render(ui);

    expect(screen.queryByText(/회식/)).not.toBeInTheDocument();
  });
});
