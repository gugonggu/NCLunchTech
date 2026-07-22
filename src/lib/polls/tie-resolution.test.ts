import { describe, expect, it, vi } from "vitest";
import { chooseTiedOption, type TieResolutionOption } from "./tie-resolution";

const options: TieResolutionOption[] = [
  { id: "first", position: 0, distanceM: 400, completedVisitCount: 3 },
  { id: "second", position: 1, distanceM: 100, completedVisitCount: 1 },
  { id: "third", position: 2, distanceM: 100, completedVisitCount: 1 },
];

describe("chooseTiedOption", () => {
  it("chooses a random tied option without considering non-tied choices", () => {
    const random = vi.fn(() => 0.99);

    expect(chooseTiedOption(options.slice(0, 2), "random", random)?.id).toBe("second");
    expect(random).toHaveBeenCalledOnce();
  });

  it("chooses the closest option and breaks equal distances by poll option position", () => {
    expect(chooseTiedOption(options, "nearest")?.id).toBe("second");
  });

  it("chooses the least visited option and breaks equal counts by poll option position", () => {
    expect(chooseTiedOption(options, "least_visited")?.id).toBe("second");
  });

  it("returns null when there are no tied options", () => {
    expect(chooseTiedOption([], "random")).toBeNull();
  });

  it("uses option position when nearest data is unavailable", () => {
    expect(
      chooseTiedOption(
        [
          { id: "later", position: 2 },
          { id: "earlier", position: 1 },
        ],
        "nearest"
      )?.id
    ).toBe("earlier");
  });
});
