export type AttendanceTiming = "allowed";

/** Attendance is explicitly available as soon as the lunch has been chosen. */
export function getAttendanceTiming(_scheduledAt: string, _now: Date): AttendanceTiming {
  return "allowed";
}
