import { describe, expect, it } from "vitest";
import { selectHomeHero } from "./home-state";

describe("selectHomeHero", () => {
  it("prioritizes confirmation over every other state", () => {
    expect(
      selectHomeHero({
        needsConfirmation: true,
        needsPollResponse: true,
        hasPlannedLunch: true,
        hasCompletedLunch: true,
      }),
    ).toBe("confirmation");
  });

  it("prioritizes an open poll before an existing decision", () => {
    expect(
      selectHomeHero({
        needsConfirmation: false,
        needsPollResponse: true,
        hasPlannedLunch: true,
        hasCompletedLunch: false,
      }),
    ).toBe("poll");
  });

  it("shows decision, follow-up and recommendation in that order", () => {
    expect(
      selectHomeHero({
        needsConfirmation: false,
        needsPollResponse: false,
        hasPlannedLunch: true,
        hasCompletedLunch: false,
      }),
    ).toBe("decision");
    expect(
      selectHomeHero({
        needsConfirmation: false,
        needsPollResponse: false,
        hasPlannedLunch: false,
        hasCompletedLunch: true,
      }),
    ).toBe("follow-up");
    expect(
      selectHomeHero({
        needsConfirmation: false,
        needsPollResponse: false,
        hasPlannedLunch: false,
        hasCompletedLunch: false,
      }),
    ).toBe("recommend");
  });
});
