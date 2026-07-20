export const CSV_IMPORT_STATUS_MESSAGES = {
  no_file: "파일을 선택해주세요.",
  header_invalid_menu: "헤더가 올바르지 않습니다. 예상 형식: kakao_place_id,name,price",
  header_invalid_hours: "헤더가 올바르지 않습니다. 예상 형식: kakao_place_id,day_of_week,is_closed,open_time,close_time",
  batch_not_found: "존재하지 않는 업로드예요.",
  already_applied: "이미 반영된 업로드예요.",
  applied: "반영했어요.",
} as const;

export type CsvImportStatusCode = keyof typeof CSV_IMPORT_STATUS_MESSAGES;

export function isCsvImportStatusCode(value: string | undefined): value is CsvImportStatusCode {
  return !!value && Object.prototype.hasOwnProperty.call(CSV_IMPORT_STATUS_MESSAGES, value);
}
