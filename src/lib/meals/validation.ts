import { z } from "zod";

const blankToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const optionalUuid = z.preprocess(blankToUndefined, z.string().uuid().optional());
export const mealMenuNameSchema = z.string().trim().min(1).max(100);
const optionalMenuName = z.preprocess(blankToUndefined, mealMenuNameSchema.optional());
const paidPrice = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : value;
}, z.number().int().min(0).max(10_000_000));

export const mealRecordSchema = z
  .object({
    menuItemId: optionalUuid,
    customMenuName: optionalMenuName,
    paidPrice,
  })
  .refine((value) => Boolean(value.menuItemId) !== Boolean(value.customMenuName), {
    message: "등록 메뉴 또는 직접 입력 중 하나만 선택해주세요.",
  });

export const mealSourceSchema = z
  .object({
    visitId: optionalUuid,
    appointmentId: optionalUuid,
  })
  .refine((value) => Boolean(value.visitId) !== Boolean(value.appointmentId), {
    message: "방문 또는 약속 중 하나가 필요합니다.",
  });

export type MealSource = z.infer<typeof mealSourceSchema>;

export const MEAL_STATUS_MESSAGES = {
  saved: "먹은 메뉴와 가격을 저장했어요.",
  invalid_input: "메뉴와 실제 지불 가격을 확인해주세요.",
  invalid_source: "완료된 본인 방문 또는 약속만 기록할 수 있어요.",
  invalid_menu: "선택한 메뉴가 이 식당의 등록 메뉴가 아니에요.",
} as const;

export type MealStatusCode = keyof typeof MEAL_STATUS_MESSAGES;

export function isMealStatusCode(value: string | undefined): value is MealStatusCode {
  return typeof value === "string" && Object.hasOwn(MEAL_STATUS_MESSAGES, value);
}

export type CompletedMealSourceCandidate =
  | {
      kind: "visit";
      employeeId: string;
      restaurantId: string;
      status: string;
    }
  | {
      kind: "appointment";
      restaurantId: string;
      hostEmployeeId: string;
      hostAttendanceStatus: string | null;
      participantEmployeeId: string | null;
      participantStatus: string | null;
    };

export function isCompletedMealSource(
  source: CompletedMealSourceCandidate,
  employeeId: string,
  restaurantId: string
): boolean {
  if (source.restaurantId !== restaurantId) return false;

  if (source.kind === "visit") {
    return source.employeeId === employeeId && source.status === "completed";
  }

  const completedHost =
    source.hostEmployeeId === employeeId && source.hostAttendanceStatus === "completed";
  const completedParticipant =
    source.participantEmployeeId === employeeId && source.participantStatus === "completed";
  return completedHost || completedParticipant;
}

export function normalizeMealRecordFormData(formData: FormData) {
  return {
    menuItemId: formData.get("menuItemId"),
    customMenuName: formData.get("customMenuName"),
    paidPrice: formData.get("paidPrice"),
  };
}
