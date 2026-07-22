// @vitest-environment jsdom
import { render } from "@testing-library/react";
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
  vi.mocked(getCurrentEmployee).mockResolvedValue({ id: "emp-1", nickname: "tester" });
  vi.mocked(getUnreadNotificationCount).mockResolvedValue(0);
  vi.mocked(getMealRecordForSource).mockResolvedValue(null);
  vi.mocked(getRelevantPolls).mockResolvedValue([]);
  vi.mocked(getLunchAvailabilities).mockResolvedValue([]);
  vi.mocked(getPublicRecruitingAppointments).mockResolvedValue([]);
  vi.mocked(getRestaurantOfTheMonth).mockResolvedValue(null);
  mockSettingsMaybeSingle.mockResolvedValue({
    data: { company_lat: 35.17, company_lng: 129.13, announcement: null },
  });
}

describe("HomePage review prompt", () => {
  it("hides the review prompt after the employee already reviewed today's restaurant", async () => {
    mockDefaults();
    vi.mocked(getActiveVisitToday).mockResolvedValue({
      id: "visit-1",
      restaurantId: "r-1",
      status: "completed",
      restaurantName: "Reviewed Lunch",
      restaurantCategory: "Korean",
      restaurantLat: 35.171,
      restaurantLng: 129.131,
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(getRelevantAppointments).mockResolvedValue([]);
    vi.mocked(hasMyReview).mockResolvedValue(true);

    const ui = await HomePage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    expect(container.querySelector('a[href="/reviews/new?restaurantId=r-1&visitId=visit-1"]')).not.toBeInTheDocument();
  });

  it("keeps a completed lunch card next to an open poll card instead of replacing it", async () => {
    mockDefaults();
    vi.mocked(getActiveVisitToday).mockResolvedValue({
      id: "visit-1",
      restaurantId: "r-1",
      status: "completed",
      restaurantName: "Reviewed Lunch",
      restaurantCategory: "Korean",
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
    vi.mocked(hasMyReview).mockResolvedValue(false);

    const ui = await HomePage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    const hrefs = [...container.querySelectorAll("a")].map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/polls/poll-1");
    expect(hrefs).toContain("/reviews/new?restaurantId=r-1&visitId=visit-1");
  });
});
