import { z } from "zod";

export const COMMENT_MAX_LENGTH = 300;

export const commentContentSchema = z
  .string()
  .trim()
  .min(1, "댓글을 입력해주세요.")
  .max(COMMENT_MAX_LENGTH, `댓글은 ${COMMENT_MAX_LENGTH}자 이하여야 합니다.`);

/** 리뷰 상세(?commentStatus=)에 전달되는 안내 문구. 허용 목록에 없는 값은 화면에 표시하지 않는다. */
export const COMMENT_STATUS_MESSAGES = {
  created: "댓글을 남겼어요.",
  updated: "댓글을 수정했어요.",
  deleted: "댓글을 삭제했어요.",
  invalid_input: "댓글 내용을 다시 확인해주세요.",
  not_found: "존재하지 않는 댓글이에요.",
  not_author: "본인이 작성한 댓글만 수정·삭제할 수 있어요.",
} as const;

export type CommentStatusCode = keyof typeof COMMENT_STATUS_MESSAGES;

export function isCommentStatusCode(value: string | undefined): value is CommentStatusCode {
  return !!value && Object.prototype.hasOwnProperty.call(COMMENT_STATUS_MESSAGES, value);
}
