const CONFIRMATION_DELAY_MS = 60 * 60 * 1000;

/** 개인 방문 결정 시각 또는 약속 예정 시각에서 1시간이 지난 뒤 방문 확인을 허용한다. */
export function isPastConfirmationWindow(referenceTime: Date, now: Date): boolean {
  return now.getTime() - referenceTime.getTime() >= CONFIRMATION_DELAY_MS;
}
