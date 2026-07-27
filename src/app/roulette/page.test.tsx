// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchAllRows: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createServiceRoleClient: vi.fn(() => ({ from: vi.fn() })) }));
vi.mock("@/lib/supabase/fetch-all", () => ({ fetchAllRows: mocks.fetchAllRows }));
vi.mock("@/app/visits/actions", () => ({ decideRestaurant: vi.fn() }));
vi.mock("./RouletteWorkspace", () => ({
  RouletteWorkspace: ({ initialCandidates }: { initialCandidates: Array<{ name: string }> }) => <p>룰렛 후보: {initialCandidates.map((candidate) => candidate.name).join(", ")}</p>,
}));

import RoulettePage from "./page";

it("renders an independent roulette workspace with active restaurants", async () => {
  mocks.fetchAllRows.mockResolvedValue([{ id: "a", name: "활성 식당" }]);

  render(await RoulettePage());

  expect(screen.getByText("룰렛 후보: 활성 식당")).toBeVisible();
});

it("shows an empty state instead of a zero-slot wheel when no active restaurants exist", async () => {
  mocks.fetchAllRows.mockResolvedValue([]);

  render(await RoulettePage());

  expect(screen.getByText("활성 식당이 없어요")).toBeVisible();
});
