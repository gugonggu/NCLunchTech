// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  maybeEmployee: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  order: vi.fn(),
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentEmployee: mocks.maybeEmployee,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({ from: mocks.from }),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));

import NewAppointmentPage from "./page";

function mockQueryBuilder() {
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.maybeSingle, order: mocks.order });
}

function resetMocks() {
  mockQueryBuilder();
  mocks.maybeSingle.mockResolvedValue({
    data: { id: "r1", name: "점심식당", category: "한식" },
  });
}

resetMocks();

afterEach(() => {
  vi.clearAllMocks();
  resetMocks();
});

describe("NewAppointmentPage", () => {
  it("shows active restaurants instead of returning 404 when no restaurant is selected", async () => {
    mocks.maybeEmployee.mockResolvedValue({ id: "employee-1" });
    mocks.order.mockResolvedValue({
      data: [
        { id: "r1", name: "점심식당", category: "한식" },
        { id: "r2", name: "면가", category: "중식" },
      ],
    });

    render(await NewAppointmentPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "함께 먹기" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /점심식당/ })).toHaveAttribute(
      "href",
      "/appointments/new?restaurantId=r1",
    );
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it("shows an empty state that links to the restaurant directory", async () => {
    mocks.maybeEmployee.mockResolvedValue({ id: "employee-1" });
    mocks.order.mockResolvedValue({ data: [] });

    render(await NewAppointmentPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("선택할 수 있는 식당이 없어요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "식당 둘러보기" })).toHaveAttribute("href", "/restaurants");
  });

  it("redirects unauthenticated restaurant selection to the login page", async () => {
    mocks.maybeEmployee.mockResolvedValue(null);
    mocks.order.mockResolvedValue({ data: [] });

    await NewAppointmentPage({ searchParams: Promise.resolve({}) });

    expect(mocks.redirect).toHaveBeenCalledWith("/login?returnTo=%2Fappointments%2Fnew");
  });

  it("renders the existing appointment form for a selected restaurant", async () => {
    mocks.maybeEmployee.mockResolvedValue({ id: "employee-1" });

    render(await NewAppointmentPage({ searchParams: Promise.resolve({ restaurantId: "r1" }) }));

    expect(screen.getByRole("button", { name: "약속 만들기" })).toBeInTheDocument();
    expect(screen.getByLabelText("약속 시각")).toBeInTheDocument();
  });
});
