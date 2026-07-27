import { describe, expect, it } from "vitest";
import {
  MAX_ROULETTE_SLOTS,
  addEntry,
  changeEntryWeight,
  getTotalSlots,
  getRotationToPointer,
  pickWeightedEntry,
  removeEntry,
} from "./roulette";

describe("weighted roulette entries", () => {
  it("keeps each candidate at one or more slots and caps the total at 64", () => {
    const single = [{ id: "a", name: "A", weight: 1 }];
    expect(changeEntryWeight(single, "a", -1)).toEqual(single);

    const full = [{ id: "a", name: "A", weight: MAX_ROULETTE_SLOTS - 1 }, { id: "b", name: "B", weight: 1 }];
    expect(changeEntryWeight(full, "a", 1)).toEqual(full);
  });

  it("rotates a selected sector midpoint to the 12 o'clock pointer", () => {
    expect(getRotationToPointer(90)).toBe(270);
    expect(getRotationToPointer(270)).toBe(90);
    expect(getRotationToPointer(90, 270)).toBe(0);
  });

  it("adds and removes candidates without allowing an empty list", () => {
    const entries = [{ id: "a", name: "A", weight: 1 }];
    expect(removeEntry(entries, "a")).toEqual(entries);
    expect(addEntry(entries, { id: "b", name: "B" })).toEqual([...entries, { id: "b", name: "B", weight: 1 }]);
    expect(removeEntry(addEntry(entries, { id: "b", name: "B" }), "b")).toEqual(entries);
  });

  it("selects a candidate by its cumulative slot range", () => {
    const entries = [{ id: "a", name: "A", weight: 1 }, { id: "b", name: "B", weight: 3 }];
    expect(getTotalSlots(entries)).toBe(4);
    expect(pickWeightedEntry(entries, () => 0)?.id).toBe("a");
    expect(pickWeightedEntry(entries, () => 0.25)?.id).toBe("b");
    expect(pickWeightedEntry(entries, () => 0.999)?.id).toBe("b");
  });
});
