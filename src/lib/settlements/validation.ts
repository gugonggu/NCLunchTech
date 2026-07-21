import { z } from "zod";

export const ROUNDING_UNITS = [1, 10, 100] as const;
export type RoundingUnit = (typeof ROUNDING_UNITS)[number];

export const MAX_SETTLEMENT_AMOUNT = 10_000_000;

const roundingUnitSchema = z.union([z.literal(1), z.literal(10), z.literal(100)]);

export const settlementInputSchema = z.object({
  payerEmployeeId: z.string().uuid(),
  totalAmount: z.coerce.number().int().min(1, "총 금액을 입력해주세요.").max(MAX_SETTLEMENT_AMOUNT),
  roundingUnit: z.coerce.number().pipe(roundingUnitSchema),
});

export type SettlementInput = z.infer<typeof settlementInputSchema>;

function roundToUnit(value: number, unit: number): number {
  return Math.round(value / unit) * unit;
}

/**
 * 총 금액을 참석자 전원에게 균등 분할한다. 결제자를 제외한 인원은 정산 단위로 반올림한 금액을
 * 부담하고, 반올림으로 생기는 나머지(총액 - 나머지 인원 합계)는 결제자가 그대로 떠안는다.
 * participantIds는 결제자를 포함한 전체 실제 참석자 목록이어야 한다.
 * 반환값의 합계는 항상 totalAmount와 정확히 일치한다.
 */
export function calculateSettlementShares(params: {
  totalAmount: number;
  participantIds: string[];
  payerEmployeeId: string;
  roundingUnit: number;
}): Map<string, number> {
  const { totalAmount, participantIds, payerEmployeeId, roundingUnit } = params;
  const uniqueIds = [...new Set(participantIds)];
  const others = uniqueIds.filter((id) => id !== payerEmployeeId);

  const perPerson = uniqueIds.length > 0 ? roundToUnit(totalAmount / uniqueIds.length, roundingUnit) : 0;

  const shares = new Map<string, number>();
  let othersTotal = 0;
  for (const id of others) {
    shares.set(id, perPerson);
    othersTotal += perPerson;
  }
  shares.set(payerEmployeeId, totalAmount - othersTotal);

  return shares;
}

export interface SettlementShareRow {
  employeeNickname: string;
  amount: number;
  isPayer: boolean;
}

/**
 * 사내 메신저에 붙여넣기 좋은 정산 결과 텍스트를 만든다.
 * 예: "오늘 점심 정산입니다!\n\n총 38,000원 / 3명\n김사원 → 홍천 12,700원\n..."
 */
export function buildSettlementClipboardText(params: {
  restaurantName: string;
  totalAmount: number;
  shares: SettlementShareRow[];
}): string {
  const payer = params.shares.find((s) => s.isPayer);
  const lines = params.shares
    .filter((s) => !s.isPayer)
    .map((s) => `${s.employeeNickname} → ${payer?.employeeNickname ?? "결제자"} ${s.amount.toLocaleString("ko-KR")}원`);

  if (payer) {
    lines.push(`${payer.employeeNickname} 부담 ${payer.amount.toLocaleString("ko-KR")}원`);
  }

  return [
    "오늘 점심 정산입니다!",
    "",
    `${params.restaurantName} · 총 ${params.totalAmount.toLocaleString("ko-KR")}원 / ${params.shares.length}명`,
    ...lines,
  ].join("\n");
}

export const SETTLEMENT_STATUS_MESSAGES = {
  saved: "정산 결과를 저장했어요.",
  invalid_input: "입력값을 다시 확인해주세요.",
  no_attendees: "실제 참석자가 없어서 정산할 수 없어요.",
  invalid_payer: "결제자는 실제 참석자 중에서만 선택할 수 있어요.",
  not_attendee: "실제 참석자만 정산을 등록할 수 있어요.",
  not_found: "존재하지 않는 약속이에요.",
} as const;

export type SettlementStatusCode = keyof typeof SETTLEMENT_STATUS_MESSAGES;

export function isSettlementStatusCode(value: string | undefined): value is SettlementStatusCode {
  return !!value && Object.prototype.hasOwnProperty.call(SETTLEMENT_STATUS_MESSAGES, value);
}
