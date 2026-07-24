import { describe, expect, it } from "vitest";
import {
  buildSettlementClipboardText,
  calculateSettlementShares,
  isSettlementStatusCode,
  settlementInputSchema,
} from "./validation";

function sum(shares: Map<string, number>): number {
  return [...shares.values()].reduce((a, b) => a + b, 0);
}

describe("calculateSettlementShares", () => {
  it("42,000원 / 4명 / 1원 단위 — 합계가 정확히 일치한다", () => {
    const shares = calculateSettlementShares({
      totalAmount: 42000,
      participantIds: ["a", "b", "c", "d"],
      payerEmployeeId: "a",
      roundingUnit: 1,
    });
    expect(sum(shares)).toBe(42000);
    expect(shares.get("b")).toBe(10500);
    expect(shares.get("a")).toBe(10500);
  });

  it("38,000원 / 3명 / 100원 단위 — 스펙 예시와 정확히 일치한다", () => {
    const shares = calculateSettlementShares({
      totalAmount: 38000,
      participantIds: ["payer", "b", "c"],
      payerEmployeeId: "payer",
      roundingUnit: 100,
    });
    expect(shares.get("b")).toBe(12700);
    expect(shares.get("c")).toBe(12700);
    expect(shares.get("payer")).toBe(12600);
    expect(sum(shares)).toBe(38000);
  });

  it("10,001원 / 3명 / 1원 단위 — 합계가 정확히 일치한다", () => {
    const shares = calculateSettlementShares({
      totalAmount: 10001,
      participantIds: ["a", "b", "c"],
      payerEmployeeId: "a",
      roundingUnit: 1,
    });
    expect(sum(shares)).toBe(10001);
  });

  it("10,050원 / 4명 / 10원 단위 — 합계가 정확히 일치한다", () => {
    const shares = calculateSettlementShares({
      totalAmount: 10050,
      participantIds: ["a", "b", "c", "d"],
      payerEmployeeId: "a",
      roundingUnit: 10,
    });
    expect(sum(shares)).toBe(10050);
  });

  it("결제자 혼자만 참석해도 전액을 부담한다", () => {
    const shares = calculateSettlementShares({
      totalAmount: 15000,
      participantIds: ["a"],
      payerEmployeeId: "a",
      roundingUnit: 100,
    });
    expect(shares.get("a")).toBe(15000);
    expect(sum(shares)).toBe(15000);
  });

  it("참석자 id 중복은 한 번만 계산한다", () => {
    const shares = calculateSettlementShares({
      totalAmount: 10000,
      participantIds: ["a", "b", "b"],
      payerEmployeeId: "a",
      roundingUnit: 1,
    });
    expect(shares.size).toBe(2);
    expect(sum(shares)).toBe(10000);
  });

  it("지정한 사람이 1,000원 단위 반올림 차액을 부담한다", () => {
    const shares = calculateSettlementShares({
      totalAmount: 38000,
      participantIds: ["a", "b", "c"],
      payerEmployeeId: "a",
      roundingEmployeeId: "c",
      roundingUnit: 1000,
    });
    expect(shares.get("a")).toBe(13000);
    expect(shares.get("b")).toBe(13000);
    expect(shares.get("c")).toBe(12000);
    expect(sum(shares)).toBe(38000);
  });
});

describe("buildSettlementClipboardText", () => {
  it("결제자에게 → 로 향하는 문구와 부담 문구를 포함한다", () => {
    const text = buildSettlementClipboardText({
      restaurantName: "더차이나",
      totalAmount: 38000,
      shares: [
        { employeeNickname: "김사원", amount: 12700, isPayer: false },
        { employeeNickname: "이대리", amount: 12700, isPayer: false },
        { employeeNickname: "홍천", amount: 12600, isPayer: true },
      ],
    });
    expect(text).toContain("김사원 → 홍천 12,700원");
    expect(text).toContain("이대리 → 홍천 12,700원");
    expect(text).toContain("홍천 부담 12,600원");
    expect(text).toContain("총 38,000원 / 3명");
  });
});

describe("settlementInputSchema", () => {
  it("정산 단위가 1/10/100이 아니면 거부한다", () => {
    const result = settlementInputSchema.safeParse({
      payerEmployeeId: "00000000-0000-0000-0000-000000000001",
      totalAmount: "10000",
      roundingUnit: "50",
    });
    expect(result.success).toBe(false);
  });

  it("정상 입력은 통과하고 숫자로 강제 변환된다", () => {
    const result = settlementInputSchema.safeParse({
      payerEmployeeId: "00000000-0000-4000-8000-000000000001",
      totalAmount: "38000",
      roundingUnit: "100",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalAmount).toBe(38000);
      expect(result.data.roundingUnit).toBe(100);
    }
  });
});

describe("isSettlementStatusCode", () => {
  it("허용 목록에 있는 값만 통과한다", () => {
    expect(isSettlementStatusCode("saved")).toBe(true);
    expect(isSettlementStatusCode("아무거나")).toBe(false);
    expect(isSettlementStatusCode(undefined)).toBe(false);
  });
});
