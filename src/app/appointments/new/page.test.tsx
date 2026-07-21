// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  maybeEmployee: vi.fn(),
  createServiceRoleClient: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  order: vi.fn(),
  notFound: vi.fn(),
  redirect: vi.fn(),
  redirectSignal: new Error("NEXT_REDIRECT"),
  notFoundSignal: new Error("NEXT_NOT_FOUND"),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentEmployee: mocks.maybeEmployee,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
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
  mocks.createServiceRoleClient.mockReturnValue({ from: mocks.from });
  mockQueryBuilder();
  mocks.maybeSingle.mockResolvedValue({
    data: { id: "r1", name: "점심식당", category: "한식" },
  });
  mocks.redirect.mockImplementation(() => {
    throw mocks.redirectSignal;
  });
  mocks.notFound.mockImplementation(() => {
    throw mocks.notFoundSignal;
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
    expect(screen.getByText("함께할 식당을 먼저 골라 주세요.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /점심식당/ })).toHaveAttribute(
      "href",
      "/appointments/new?restaurantId=r1",
    );
    expect(mocks.from).toHaveBeenCalledWith("restaurants");
    expect(mocks.select).toHaveBeenCalledWith("id, name, category");
    expect(mocks.eq).toHaveBeenCalledWith("is_active", true);
    expect(mocks.order).toHaveBeenCalledWith("name", { ascending: true });
    expect(mocks.from).toHaveBeenCalledOnce();
    expect(mocks.select).toHaveBeenCalledOnce();
    expect(mocks.eq).toHaveBeenCalledOnce();
    expect(mocks.order).toHaveBeenCalledOnce();
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it("shows an empty state that links to the restaurant directory", async () => {
    mocks.maybeEmployee.mockResolvedValue({ id: "employee-1" });
    mocks.order.mockResolvedValue({ data: [] });

    render(await NewAppointmentPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("선택할 수 있는 식당이 없어요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "식당 둘러보기" })).toHaveAttribute("href", "/restaurants");
  });

  it("shows an error state instead of an empty state when the restaurant query fails", async () => {
    mocks.maybeEmployee.mockResolvedValue({ id: "employee-1" });
    mocks.order.mockResolvedValue({ data: null, error: { message: "database unavailable" } });

    render(await NewAppointmentPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("alert")).toHaveTextContent("식당 목록을 불러오지 못했어요");
    expect(screen.getByText("잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "다시 시도" })).toHaveAttribute("href", "/appointments/new");
    expect(screen.queryByText("선택할 수 있는 식당이 없어요")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated restaurant selection to the login page", async () => {
    mocks.maybeEmployee.mockResolvedValue(null);

    await expect(NewAppointmentPage({ searchParams: Promise.resolve({}) })).rejects.toBe(mocks.redirectSignal);

    expect(mocks.redirect).toHaveBeenCalledWith("/login?returnTo=%2Fappointments%2Fnew");
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("preserves the selected restaurant in the unauthenticated redirect", async () => {
    mocks.maybeEmployee.mockResolvedValue(null);

    await expect(
      NewAppointmentPage({ searchParams: Promise.resolve({ restaurantId: "r1" }) }),
    ).rejects.toBe(mocks.redirectSignal);

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/login?returnTo=%2Fappointments%2Fnew%3FrestaurantId%3Dr1",
    );
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it.each(["missing", "inactive"])("invokes notFound for a %s selected restaurant", async () => {
    mocks.maybeEmployee.mockResolvedValue({ id: "employee-1" });
    mocks.maybeSingle.mockResolvedValue({ data: null });

    await expect(
      NewAppointmentPage({ searchParams: Promise.resolve({ restaurantId: "r1" }) }),
    ).rejects.toBe(mocks.notFoundSignal);

    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it("renders the existing appointment form for a selected restaurant", async () => {
    mocks.maybeEmployee.mockResolvedValue({ id: "employee-1" });

    render(await NewAppointmentPage({ searchParams: Promise.resolve({ restaurantId: "r1" }) }));

    expect(screen.getByRole("button", { name: "약속 만들기" })).toBeInTheDocument();
    expect(screen.getByLabelText("약속 시각")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "함께 먹기" })).toBeInTheDocument();
  });
});
