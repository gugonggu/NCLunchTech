import { z } from "zod";
import { parseCsvRows } from "./csv-parse";

export const MAX_CSV_BYTES = 2 * 1024 * 1024;
export const MAX_CSV_DATA_ROWS = 5000;

export const adminUuidSchema = z.string().uuid("올바른 식별자가 아닙니다.");

export const inviteCodeSchema = z
  .string()
  .trim()
  .min(4, "초대코드는 4자 이상이어야 합니다.")
  .max(64, "초대코드는 64자 이하여야 합니다.")
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "초대코드에 제어문자를 사용할 수 없습니다.");

export const announcementSchema = z
  .string()
  .trim()
  .max(200, "공지는 200자 이하여야 합니다.")
  .transform((value) => (value ? value : null));

const radiusSchema = z.union([z.literal(300), z.literal(500), z.literal(800), z.literal(1200), z.literal(2000)]);
const requiredFormNumber = z.union([z.number(), z.string().trim().min(1)]).pipe(z.coerce.number());

export const companySettingsSchema = z.object({
  companyLat: requiredFormNumber.pipe(z.number().min(-90).max(90)),
  companyLng: requiredFormNumber.pipe(z.number().min(-180).max(180)),
  defaultRadiusM: requiredFormNumber.pipe(radiusSchema),
});

export const menuHistorySnapshotSchema = z.object({
  price: z.number().int().nonnegative().nullable(),
  is_sold_out: z.boolean(),
});

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const hoursHistoryRowSchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6),
    is_closed: z.boolean(),
    open_time: timeSchema.nullable(),
    close_time: timeSchema.nullable(),
  })
  .superRefine((row, ctx) => {
    if (row.is_closed) {
      if (row.open_time !== null || row.close_time !== null) {
        ctx.addIssue({ code: "custom", message: "휴무일 snapshot에는 영업시간을 저장할 수 없습니다." });
      }
      return;
    }
    if (row.open_time === null || row.close_time === null || row.close_time <= row.open_time) {
      ctx.addIssue({ code: "custom", message: "영업시간 snapshot이 올바르지 않습니다." });
    }
  });

export const hoursHistorySnapshotSchema = z
  .array(hoursHistoryRowSchema)
  .max(7)
  .superRefine((rows, ctx) => {
    const days = new Set<number>();
    for (const row of rows) {
      if (days.has(row.day_of_week)) {
        ctx.addIssue({ code: "custom", message: "중복된 요일이 있습니다." });
      }
      days.add(row.day_of_week);
    }
  });

export const menuCsvRowSchema = z
  .object({
    rowNumber: z.number().int().positive(),
    kakaoPlaceId: z.string(),
    name: z.string(),
    price: z.number().int().nonnegative().nullable(),
    restaurantId: adminUuidSchema.nullable(),
    restaurantName: z.string().nullable(),
    isNew: z.boolean(),
    errors: z.array(z.string()),
  })
  .superRefine((row, ctx) => {
    if (row.errors.length === 0 && (!row.kakaoPlaceId.trim() || !row.name.trim() || row.restaurantId === null)) {
      ctx.addIssue({ code: "custom", message: "정상 메뉴 행의 필수 값이 없습니다." });
    }
  });

export const hoursCsvRowSchema = z
  .object({
    rowNumber: z.number().int().positive(),
    kakaoPlaceId: z.string(),
    dayOfWeek: z.number().int().min(0).max(6).nullable(),
    isClosed: z.boolean(),
    openTime: timeSchema.nullable(),
    closeTime: timeSchema.nullable(),
    restaurantId: adminUuidSchema.nullable(),
    restaurantName: z.string().nullable(),
    isNew: z.boolean(),
    errors: z.array(z.string()),
  })
  .superRefine((row, ctx) => {
    if (row.errors.length > 0) {
      return;
    }
    if (!row.kakaoPlaceId.trim() || row.restaurantId === null || row.dayOfWeek === null) {
      ctx.addIssue({ code: "custom", message: "정상 영업시간 행의 필수 값이 없습니다." });
      return;
    }
    if (row.isClosed) {
      if (row.openTime !== null || row.closeTime !== null) {
        ctx.addIssue({ code: "custom", message: "휴무일에는 영업시간을 저장할 수 없습니다." });
      }
      return;
    }
    if (row.openTime === null || row.closeTime === null || row.closeTime <= row.openTime) {
      ctx.addIssue({ code: "custom", message: "영업일 시간이 올바르지 않습니다." });
    }
  });

export function parseCsvBatchRows(type: "menu" | "hours", rows: unknown) {
  return type === "menu" ? z.array(menuCsvRowSchema).max(MAX_CSV_DATA_ROWS).safeParse(rows) : z.array(hoursCsvRowSchema).max(MAX_CSV_DATA_ROWS).safeParse(rows);
}

export type CsvUploadStatus =
  | "no_file"
  | "file_type_invalid"
  | "file_too_large"
  | "encoding_invalid"
  | "format_invalid"
  | "too_many_rows";

export type CsvUploadValidation =
  | { ok: true; text: string }
  | { ok: false; status: CsvUploadStatus };

export async function validateCsvUpload(file: FormDataEntryValue | null): Promise<CsvUploadValidation> {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, status: "no_file" };
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { ok: false, status: "file_type_invalid" };
  }
  if (file.size > MAX_CSV_BYTES) {
    return { ok: false, status: "file_too_large" };
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    return { ok: false, status: "encoding_invalid" };
  }

  let rows: string[][];
  try {
    rows = parseCsvRows(text);
  } catch {
    return { ok: false, status: "format_invalid" };
  }
  if (Math.max(0, rows.length - 1) > MAX_CSV_DATA_ROWS) {
    return { ok: false, status: "too_many_rows" };
  }

  return { ok: true, text };
}
