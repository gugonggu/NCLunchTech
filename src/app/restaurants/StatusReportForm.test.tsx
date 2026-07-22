// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatusReportForm } from "./StatusReportForm";

describe("StatusReportForm", () => {
  it("closes the confirmation after repeated successful submissions", async () => {
    const action = vi.fn().mockResolvedValue({ status: "success", message: "저장했어요." });
    render(<StatusReportForm values={["한산"]} action={action} />);

    fireEvent.click(screen.getByRole("button", { name: "한산" }));
    fireEvent.click(screen.getByRole("button", { name: "제보하기" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "제보하기" })).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "한산" }));
    fireEvent.click(screen.getByRole("button", { name: "제보하기" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "제보하기" })).not.toBeInTheDocument());
  });
});
