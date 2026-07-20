// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ upsertMealRecord: vi.fn() }));

import { MealRecordForm } from "./MealRecordForm";

describe("MealRecordForm", () => {
  it("uses direct input when no registered menu is selected", () => {
    render(
      <MealRecordForm
        restaurantId="restaurant-1"
        source={{ visitId: "11111111-1111-4111-8111-111111111111" }}
        menuItems={[{ id: "menu-1", name: "김치찌개", price: 9000 }]}
        existing={null}
      />
    );

    const select = screen.getByLabelText("등록 메뉴");
    const customName = screen.getByLabelText("직접 입력 메뉴명");
    expect(customName).toBeEnabled();

    fireEvent.change(select, { target: { value: "menu-1" } });
    expect(customName).toBeDisabled();

    fireEvent.change(select, { target: { value: "" } });
    expect(customName).toBeEnabled();
  });
});
