import { z } from "zod";

export const menuItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "메뉴 이름을 입력해주세요.")
    .max(50, "메뉴 이름은 50자 이하여야 합니다."),
  price: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? Number(v) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), {
      message: "가격은 0 이상의 숫자여야 합니다.",
    }),
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;
