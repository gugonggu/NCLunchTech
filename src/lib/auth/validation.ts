import { z } from "zod";

export const nicknameSchema = z
  .string()
  .trim()
  .min(2, "닉네임은 2자 이상이어야 합니다.")
  .max(20, "닉네임은 20자 이하여야 합니다.")
  .regex(/^[가-힣a-zA-Z0-9]+$/, "닉네임은 한글, 영문, 숫자만 사용할 수 있습니다.");

export const pinSchema = z.string().regex(/^\d{4}$/, "PIN은 숫자 4자리여야 합니다.");

export const signupSchema = z
  .object({
    inviteCode: z.string().min(1, "초대코드를 입력해주세요."),
    nickname: nicknameSchema,
    pin: pinSchema,
    pinConfirm: pinSchema,
  })
  .refine((data) => data.pin === data.pinConfirm, {
    message: "PIN과 PIN 확인이 일치하지 않습니다.",
    path: ["pinConfirm"],
  });

export const loginSchema = z.object({
  nickname: nicknameSchema,
  pin: pinSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
