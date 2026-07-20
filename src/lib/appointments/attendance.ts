import { isPastConfirmationWindow } from "@/lib/confirmation-window";

export type AttendanceTiming = "allowed" | "too_early";

export function getAttendanceTiming(scheduledAt: string, now: Date): AttendanceTiming {
  const scheduled = new Date(scheduledAt);
  if (Number.isNaN(scheduled.getTime())) {
    return "too_early";
  }
  return isPastConfirmationWindow(scheduled, now) ? "allowed" : "too_early";
}
