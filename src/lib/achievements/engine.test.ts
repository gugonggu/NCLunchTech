import { describe, expect, it } from "vitest";
import { applyProgressIncrement, applyProgressRecompute } from "./engine";

describe("applyProgressIncrement", () => {
  it("목표에 도달하면 justEarned가 true다", () => {
    const result = applyProgressIncrement(
      { achievementId: "a-1", code: "FIRST_VISIT", currentValue: 0, targetValue: 1 },
      false
    );
    expect(result).toEqual({ achievementId: "a-1", code: "FIRST_VISIT", newCurrentValue: 1, justEarned: true });
  });

  it("목표에 아직 도달하지 못하면 justEarned가 false다", () => {
    const result = applyProgressIncrement(
      { achievementId: "a-2", code: "VISIT_5", currentValue: 3, targetValue: 5 },
      false
    );
    expect(result).toEqual({ achievementId: "a-2", code: "VISIT_5", newCurrentValue: 4, justEarned: false });
  });

  it("이미 달성한 업적은 진행도를 늘리지 않는다", () => {
    const result = applyProgressIncrement(
      { achievementId: "a-1", code: "FIRST_VISIT", currentValue: 1, targetValue: 1 },
      true
    );
    expect(result).toEqual({ achievementId: "a-1", code: "FIRST_VISIT", newCurrentValue: 1, justEarned: false });
  });
});

describe("applyProgressRecompute", () => {
  it("재계산한 값이 목표 이상이면 justEarned가 true다", () => {
    const result = applyProgressRecompute(
      { achievementId: "a-3", code: "UNIQUE_RESTAURANT_3", targetValue: 3 },
      3,
      1,
      false
    );
    expect(result).toEqual({
      achievementId: "a-3",
      code: "UNIQUE_RESTAURANT_3",
      newCurrentValue: 3,
      justEarned: true,
    });
  });

  it("재계산한 값이 목표 미달이면 justEarned가 false다", () => {
    const result = applyProgressRecompute(
      { achievementId: "a-3", code: "UNIQUE_RESTAURANT_3", targetValue: 3 },
      2,
      1,
      false
    );
    expect(result).toEqual({
      achievementId: "a-3",
      code: "UNIQUE_RESTAURANT_3",
      newCurrentValue: 2,
      justEarned: false,
    });
  });

  it("이미 달성한 업적은 재계산 값이 줄어도 이전 값을 유지한다", () => {
    const result = applyProgressRecompute(
      { achievementId: "a-3", code: "UNIQUE_RESTAURANT_3", targetValue: 3 },
      1,
      3,
      true
    );
    expect(result).toEqual({
      achievementId: "a-3",
      code: "UNIQUE_RESTAURANT_3",
      newCurrentValue: 3,
      justEarned: false,
    });
  });
});
