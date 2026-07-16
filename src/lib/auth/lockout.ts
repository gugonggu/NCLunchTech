export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 10 * 60 * 1000;

export interface LoginAttemptState {
  failedLoginCount: number;
  lockedUntil: Date | null;
}

export interface LoginAllowedResult {
  allowed: boolean;
  retryAfterMs?: number;
  nextState: LoginAttemptState;
}

/**
 * PIN을 검증하기 전에 잠금 여부를 판단한다.
 * 잠금 기간이 이미 지났다면 실패 횟수를 초기화한 상태를 돌려준다.
 */
export function checkLoginAllowed(state: LoginAttemptState, now: Date): LoginAllowedResult {
  if (state.lockedUntil && state.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterMs: state.lockedUntil.getTime() - now.getTime(),
      nextState: state,
    };
  }

  if (state.lockedUntil && state.lockedUntil <= now) {
    return {
      allowed: true,
      nextState: { failedLoginCount: 0, lockedUntil: null },
    };
  }

  return { allowed: true, nextState: state };
}

/** PIN 검증 실패 시 다음 상태(실패 횟수 증가, 필요하면 잠금)를 계산한다. */
export function recordFailedAttempt(state: LoginAttemptState, now: Date): LoginAttemptState {
  const failedLoginCount = state.failedLoginCount + 1;

  if (failedLoginCount >= MAX_FAILED_ATTEMPTS) {
    return {
      failedLoginCount,
      lockedUntil: new Date(now.getTime() + LOCKOUT_DURATION_MS),
    };
  }

  return { failedLoginCount, lockedUntil: null };
}

export function recordSuccessfulAttempt(): LoginAttemptState {
  return { failedLoginCount: 0, lockedUntil: null };
}
