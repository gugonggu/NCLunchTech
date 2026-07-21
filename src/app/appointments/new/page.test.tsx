// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  maybeEmployee: vi.fn(),
  createServiceRoleClient: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  selectedIdEq: vi.fn(),
  selectedActiveEq: vi.fn(),
  selectedMaybeSingle: vi.fn(),
  searchAppointmentRestaurants: vi.fn(),
  notFound: vi.fn(),
  redirect: vi.fn(),
  redirectSignal: new Error("NEXT_REDIRECT"),
  notFoundSignal: new Error("NEXT_NOT_FOUND"),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentEmployee: mocks.maybeEmployee }));
vi.mock("@/lib/supabase/server", () => ({ createServiceRoleClient: mocks.createServiceRoleClient }));
vi.mock("@/lib/appointments/restaurant-search", () => ({
  searchAppointmentRestaurants: mocks.searchAppointmentRestaurants,
}));
vi.mock("./RestaurantPicker", () => ({
  RestaurantPicker: ({ state }: { state: { status: string } }) => <div data-testid="restaurant-picker">{state.status}</div>,
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound, redirect: mocks.redirect }));

import NewAppointmentPage from "./page";

type SelectedRestaurant = { id: string; kakao_place_id: string | null; name: string; category: string };

function mockSelectedRestaurantQuery(restaurant: SelectedRestaurant | null) {
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.selectedIdEq });
  mocks.selectedIdEq.mockReturnValue({ eq: mocks.selectedActiveEq });
  mocks.selectedActiveEq.mockReturnValue({ maybeSingle: mocks.selectedMaybeSingle });
  mocks.selectedMaybeSingle.mockResolvedValue({ data: restaurant });
}

function resetMocks() {
  mocks.createServiceRoleClient.mockReturnValue({ from: mocks.from });
  mockSelectedRestaurantQuery({ id: "r1", kakao_place_id: "123", name: "Restaurant", category: "Korean" });
  mocks.searchAppointmentRestaurants.mockResolvedValue({ status: "empty", filters: {} });
  mocks.redirect.mockImplementation(() => { throw mocks.redirectSignal; });
  mocks.notFound.mockImplementation(() => { throw mocks.notFoundSignal; });
}

resetMocks();

afterEach(() => {
  vi.clearAllMocks();
  resetMocks();
});

describe("NewAppointmentPage", () => {
  it("passes raw search params to the restaurant picker when no restaurant is selected", async () => {
    mocks.maybeEmployee.mockResolvedValue({ id: "employee-1" });
    const state = { status: "ready", filters: {} };
    const searchParams = { q: "lunch", category: "Korean", radius: "500", openNow: "on", sort: "name", page: "2" };
    mocks.searchAppointmentRestaurants.mockResolvedValue(state);

    render(await NewAppointmentPage({ searchParams: Promise.resolve(searchParams) }));

    expect(screen.getByTestId("restaurant-picker")).toHaveTextContent("ready");
    expect(mocks.searchAppointmentRestaurants).toHaveBeenCalledWith(searchParams);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to the login page", async () => {
    mocks.maybeEmployee.mockResolvedValue(null);

    await expect(NewAppointmentPage({ searchParams: Promise.resolve({}) })).rejects.toBe(mocks.redirectSignal);

    expect(mocks.redirect).toHaveBeenCalledWith("/login?returnTo=%2Fappointments%2Fnew");
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("preserves the selected restaurant in the unauthenticated redirect", async () => {
    mocks.maybeEmployee.mockResolvedValue(null);

    await expect(NewAppointmentPage({ searchParams: Promise.resolve({ restaurantId: "r1" }) })).rejects.toBe(mocks.redirectSignal);

    expect(mocks.redirect).toHaveBeenCalledWith("/login?returnTo=%2Fappointments%2Fnew%3FrestaurantId%3Dr1");
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it.each(["missing", "inactive"])("invokes notFound for a %s selected restaurant", async () => {
    mocks.maybeEmployee.mockResolvedValue({ id: "employee-1" });
    mockSelectedRestaurantQuery(null);

    await expect(NewAppointmentPage({ searchParams: Promise.resolve({ restaurantId: "restaurant-42" }) })).rejects.toBe(
      mocks.notFoundSignal,
    );

    expect(mocks.from).toHaveBeenCalledWith("restaurants");
    expect(mocks.select).toHaveBeenCalledWith("id, kakao_place_id, name, category");
    expect(mocks.selectedIdEq).toHaveBeenCalledWith("id", "restaurant-42");
    expect(mocks.selectedActiveEq).toHaveBeenCalledWith("is_active", true);
    expect(mocks.selectedMaybeSingle).toHaveBeenCalledOnce();
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it("renders the existing appointment form and an exact Kakao map link for a selected restaurant", async () => {
    mocks.maybeEmployee.mockResolvedValue({ id: "employee-1" });

    render(await NewAppointmentPage({ searchParams: Promise.resolve({ restaurantId: "r1" }) }));

    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/T/)).toHaveAttribute("name", "scheduledAt");
    const mapLink = document.querySelector('a[href="https://place.map.kakao.com/123"]');
    expect(mapLink).toHaveAttribute("target", "_blank");
    expect(mapLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not render a Kakao map link when the selected restaurant has no place ID", async () => {
    mocks.maybeEmployee.mockResolvedValue({ id: "employee-1" });
    mockSelectedRestaurantQuery({ id: "r1", kakao_place_id: null, name: "Restaurant", category: "Korean" });

    render(await NewAppointmentPage({ searchParams: Promise.resolve({ restaurantId: "r1" }) }));

    expect(document.querySelector('a[href^="https://place.map.kakao.com/"]')).not.toBeInTheDocument();
  });
});
