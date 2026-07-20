const CONFIRMATION_WINDOW_MS = 60 * 60 * 1000;

/** 기준 시각(결정 시각 또는 약속 시각) 이후 1시간이 지났으면 방문 확인 대기로 본다. */
export function isPastConfirmationWindow(referenceTime: Date, now: Date): boolean {
  return now.getTime() - referenceTime.getTime() >= CONFIRMATION_WINDOW_MS;
}
