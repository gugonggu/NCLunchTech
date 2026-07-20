import { z } from "zod";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const dayHoursSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    isClosed: z.boolean(),
    openTime: z.string().nullable(),
    closeTime: z.string().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.isClosed) {
      return;
    }

    const openValid = data.openTime !== null && timePattern.test(data.openTime);
    if (!openValid) {
      ctx.addIssue({
        code: "custom",
        path: ["openTime"],
        message: "영업일은 시작 시간이 필요합니다(HH:mm).",
      });
    }

    const closeValid = data.closeTime !== null && timePattern.test(data.closeTime);
    if (!closeValid) {
      ctx.addIssue({
        code: "custom",
        path: ["closeTime"],
        message: "영업일은 종료 시간이 필요합니다(HH:mm).",
      });
    }

    // HH:mm은 고정폭 문자열이라 사전식 비교가 곧 시간 비교와 같다.
    // 1차 MVP는 익일 영업(예: 22:00~02:00)을 지원하지 않으므로 종료<=시작이면 거부한다.
    if (openValid && closeValid && data.closeTime! <= data.openTime!) {
      ctx.addIssue({
        code: "custom",
        path: ["closeTime"],
        message: "종료 시간은 시작 시간보다 늦어야 합니다.",
      });
    }
  });

export const restaurantHoursSchema = z.array(dayHoursSchema).length(7);

export type DayHoursInput = z.infer<typeof dayHoursSchema>;

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

export interface OpenNowRow {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
}

/** Asia/Seoul 기준 현재 요일·시각으로 해당 요일의 영업시간과 비교해 "지금 영업 중"인지 계산한다. */
export function isOpenNow(hoursByDay: Map<number, OpenNowRow>, now: Date): boolean {
  const seoul = new Date(now.getTime() + SEOUL_OFFSET_MS);
  const dayOfWeek = seoul.getUTCDay();
  const nowHHMM = `${String(seoul.getUTCHours()).padStart(2, "0")}:${String(seoul.getUTCMinutes()).padStart(2, "0")}`;

  const row = hoursByDay.get(dayOfWeek);
  if (!row || row.isClosed || !row.openTime || !row.closeTime) {
    return false;
  }

  // HH:mm은 고정폭 문자열이라 사전식 비교가 곧 시간 비교와 같다(dayHoursSchema와 동일한 가정).
  const open = row.openTime.slice(0, 5);
  const close = row.closeTime.slice(0, 5);
  return open <= nowHHMM && nowHHMM < close;
}
