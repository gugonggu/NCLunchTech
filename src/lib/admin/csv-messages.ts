export const CSV_IMPORT_STATUS_MESSAGES = {
  no_file: "파일을 선택해주세요.",
  file_type_invalid: "확장자가 .csv인 파일만 업로드할 수 있어요.",
  file_too_large: "CSV 파일은 2 MiB 이하여야 해요.",
  encoding_invalid: "UTF-8로 읽을 수 없는 문자가 있어요.",
  format_invalid: "CSV 따옴표 형식이 올바르지 않아요.",
  too_many_rows: "CSV 데이터는 최대 5,000행까지 업로드할 수 있어요.",
  header_invalid_menu: "헤더가 올바르지 않습니다. 예상 형식: kakao_place_id,name,price",
  header_invalid_hours: "헤더가 올바르지 않습니다. 예상 형식: kakao_place_id,day_of_week,is_closed,open_time,close_time",
  batch_not_found: "존재하지 않는 업로드예요.",
  already_applied: "이미 반영된 업로드예요.",
  no_valid_rows: "반영할 수 있는 정상 행이 없어요.",
  batch_invalid: "저장된 업로드 데이터가 올바르지 않아요. 다시 업로드해주세요.",
  apply_failed: "반영 중 오류가 발생했어요. 상태를 확인한 뒤 다시 시도해주세요.",
  applied: "반영했어요.",
} as const;

export type CsvImportStatusCode = keyof typeof CSV_IMPORT_STATUS_MESSAGES;

export function isCsvImportStatusCode(value: string | undefined): value is CsvImportStatusCode {
  return !!value && Object.prototype.hasOwnProperty.call(CSV_IMPORT_STATUS_MESSAGES, value);
}
