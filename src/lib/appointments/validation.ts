import { z } from "zod";

export type AppointmentStatus = "active" | "cancelled";
export type ParticipantStatus = "pending" | "accepted" | "declined" | "cancelled";

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Asia/Seoul 기준 약속 기본 시각: 12:30 이전이면 오늘 12:30, 이후면 현재 시각 + 30분. */
export function getDefaultAppointmentTime(now: Date): Date {
  const seoulNow = new Date(now.getTime() + SEOUL_OFFSET_MS);
  const hour = seoulNow.getUTCHours();
  const minute = seoulNow.getUTCMinutes();
  const isBefore1230 = hour < 12 || (hour === 12 && minute < 30);

  if (isBefore1230) {
    const seoulTodayAt1230 = Date.UTC(
      seoulNow.getUTCFullYear(),
      seoulNow.getUTCMonth(),
      seoulNow.getUTCDate(),
      12,
      30,
      0,
      0
    );
    return new Date(seoulTodayAt1230 - SEOUL_OFFSET_MS);
  }

  return new Date(now.getTime() + 30 * 60 * 1000);
}

/** "YYYY-MM-DDTHH:mm"(datetime-local, 타임존 정보 없음)을 Asia/Seoul 벽시계 시각으로 해석해 UTC Date로 변환한다. */
export function parseSeoulDateTimeLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const seoulInstant = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
    0
  );
  return new Date(seoulInstant - SEOUL_OFFSET_MS);
}

/** Date를 datetime-local 입력의 기본값 문자열("YYYY-MM-DDTHH:mm", Asia/Seoul 벽시계 기준)로 바꾼다. */
export function formatSeoulDateTimeLocal(date: Date): string {
  const seoul = new Date(date.getTime() + SEOUL_OFFSET_MS);
  const year = seoul.getUTCFullYear();
  const month = String(seoul.getUTCMonth() + 1).padStart(2, "0");
  const day = String(seoul.getUTCDate()).padStart(2, "0");
  const hour = String(seoul.getUTCHours()).padStart(2, "0");
  const minute = String(seoul.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export const memoSchema = z
  .string()
  .trim()
  .max(100, "메모는 100자 이하여야 합니다.")
  .optional()
  .transform((v) => (v ? v : undefined));

const PARTICIPANT_TRANSITIONS: Record<ParticipantStatus, ParticipantStatus[]> = {
  pending: ["accepted", "declined"],
  accepted: ["cancelled"],
  declined: [],
  cancelled: [],
};

export function canParticipantTransition(from: ParticipantStatus, to: ParticipantStatus): boolean {
  return PARTICIPANT_TRANSITIONS[from].includes(to);
}

/** 오픈 리다이렉트 방지: 우리 서비스 내부의 상대경로만 허용하고, 그 외에는 기본 경로로 대체한다. */
export function sanitizeReturnTo(value: string | undefined | null): string {
  if (!value) {
    return "/";
  }
  if (!value.startsWith("/")) {
    return "/";
  }
  if (value.startsWith("//")) {
    return "/";
  }
  if (value.includes("\\")) {
    return "/";
  }
  return value;
}

/** 쉼표로 구분된 닉네임 입력을 정리한다(공백 제거, 빈 값·중복 제거). */
export function parseNicknameList(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(",")) {
    const nickname = part.trim();
    if (nickname && !seen.has(nickname)) {
      seen.add(nickname);
      result.push(nickname);
    }
  }
  return result;
}

/** 약속 화면(?status=)에 전달되는 안내 문구. 허용 목록에 없는 값은 화면에 표시하지 않는다. */
export const APPOINTMENT_STATUS_MESSAGES = {
  created: "약속을 만들었어요.",
  updated: "약속 정보를 변경했어요.",
  cancelled: "약속을 취소했어요.",
  accepted: "참여를 수락했어요.",
  declined: "참여를 거절했어요.",
  withdrawn: "참여를 취소했어요.",
  invalid_time: "약속 시각은 현재보다 미래여야 해요.",
  invalid_memo: "메모는 100자 이하로 입력해주세요.",
  inactive_restaurant: "운영하지 않는 식당이라 약속을 만들 수 없어요.",
  not_found: "존재하지 않는 약속이에요.",
  expired: "이미 지난 약속이라 응답할 수 없어요.",
  cancelled_appointment: "취소된 약속이에요.",
  not_host: "방장만 할 수 있는 작업이에요.",
  already_responded: "이미 응답한 약속이에요.",
} as const;

export type AppointmentStatusCode = keyof typeof APPOINTMENT_STATUS_MESSAGES;

export function isAppointmentStatusCode(value: string | undefined): value is AppointmentStatusCode {
  return !!value && Object.prototype.hasOwnProperty.call(APPOINTMENT_STATUS_MESSAGES, value);
}
