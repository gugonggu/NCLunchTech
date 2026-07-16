import { describe, expect, it } from "vitest";
import {
  MAX_FAILED_ATTEMPTS,
  checkLoginAllowed,
  recordFailedAttempt,
  recordSuccessfulAttempt,
} from "./lockout";

const now = new Date("2026-07-16T00:00:00Z");

describe("checkLoginAllowed", () => {
  it("잠금 이력이 없으면 허용한다", () => {
    const result = checkLoginAllowed({ failedLoginCount: 0, lockedUntil: null }, now);
    expect(result.allowed).toBe(true);
  });

  it("잠금 시간이 지나지 않았으면 거부하고 남은 시간을 알려준다", () => {
    const lockedUntil = new Date(now.getTime() + 5 * 60 * 1000);
    const result = checkLoginAllowed({ failedLoginCount: 5, lockedUntil }, now);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBe(5 * 60 * 1000);
  });

  it("잠금 시간이 지났으면 허용하고 실패 횟수를 초기화한다", () => {
    const lockedUntil = new Date(now.getTime() - 1000);
    const result = checkLoginAllowed({ failedLoginCount: 5, lockedUntil }, now);
    expect(result.allowed).toBe(true);
    expect(result.nextState).toEqual({ failedLoginCount: 0, lockedUntil: null });
  });
});

describe("recordFailedAttempt", () => {
  it("4번째 실패까지는 잠그지 않는다", () => {
    const state = recordFailedAttempt({ failedLoginCount: 3, lockedUntil: null }, now);
    expect(state.failedLoginCount).toBe(4);
    expect(state.lockedUntil).toBeNull();
  });

  it(`${MAX_FAILED_ATTEMPTS}번째 실패에서 10분 잠근다`, () => {
    const state = recordFailedAttempt(
      { failedLoginCount: MAX_FAILED_ATTEMPTS - 1, lockedUntil: null },
      now
    );
    expect(state.failedLoginCount).toBe(MAX_FAILED_ATTEMPTS);
    expect(state.lockedUntil?.getTime()).toBe(now.getTime() + 10 * 60 * 1000);
  });
});

describe("recordSuccessfulAttempt", () => {
  it("실패 횟수와 잠금을 초기화한다", () => {
    expect(recordSuccessfulAttempt()).toEqual({ failedLoginCount: 0, lockedUntil: null });
  });
});
