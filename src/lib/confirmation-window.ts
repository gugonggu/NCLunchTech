/** 약속 예정 시각에 도달했거나 지났으면 방문 확인이 가능하다. */
export function hasAppointmentStarted(scheduledAt: Date, now: Date): boolean {
  return now.getTime() >= scheduledAt.getTime();
}
