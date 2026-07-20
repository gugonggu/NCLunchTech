import { z } from "zod";

export function parseAdminRpcStatus(value: unknown, allowed: readonly string[]): string {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error("관리자 작업 결과가 올바르지 않습니다.");
  }
  return value;
}

export function parseAdminRpcObjectStatus(value: unknown, allowed: readonly string[]): string {
  const parsed = z.object({ status: z.string() }).safeParse(value);
  if (!parsed.success || !allowed.includes(parsed.data.status)) {
    throw new Error("관리자 작업 결과가 올바르지 않습니다.");
  }
  return parsed.data.status;
}

const csvApplyRpcResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("applied"), type: z.enum(["menu", "hours"]), appliedCount: z.number().int().positive() }),
  z.object({ status: z.enum(["batch_not_found", "already_applied", "no_valid_rows"]) }),
]);

export type CsvApplyRpcResult = z.infer<typeof csvApplyRpcResultSchema>;

export function parseCsvApplyRpcResult(value: unknown): CsvApplyRpcResult {
  const parsed = csvApplyRpcResultSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("CSV 반영 결과가 올바르지 않습니다.");
  }
  return parsed.data;
}
