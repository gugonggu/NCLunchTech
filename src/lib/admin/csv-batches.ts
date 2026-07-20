import "server-only";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { MenuCsvRow } from "./csv-menu";
import type { HoursCsvRow } from "./csv-hours";
import { requireQuerySuccess } from "./db-result";
import { adminUuidSchema, parseCsvBatchRows } from "./validation";

export type CsvBatchType = "menu" | "hours";
export type CsvBatchStatus = "pending" | "applied";

const zCsvBatchType = z.enum(["menu", "hours"]);
const zCsvBatchStatus = z.enum(["pending", "applied"]);

export class InvalidCsvBatchError extends Error {
  constructor() {
    super("CSV 업로드 데이터가 손상되었습니다.");
    this.name = "InvalidCsvBatchError";
  }
}

export interface CsvBatch {
  id: string;
  adminId: string;
  type: CsvBatchType;
  status: CsvBatchStatus;
  rows: MenuCsvRow[] | HoursCsvRow[];
  createdAt: string;
  appliedAt: string | null;
}

export async function createCsvBatch(
  adminId: string,
  type: CsvBatchType,
  rows: MenuCsvRow[] | HoursCsvRow[]
): Promise<string> {
  const adminIdResult = adminUuidSchema.safeParse(adminId);
  const rowsResult = parseCsvBatchRows(type, rows);
  if (!adminIdResult.success || !rowsResult.success) {
    throw new Error("CSV 업로드 데이터가 올바르지 않습니다.");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("csv_import_batches")
    .insert({ admin_id: adminIdResult.data, type, rows: rowsResult.data })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("CSV 업로드 저장에 실패했습니다.");
  }

  return data.id;
}

export async function getCsvBatch(batchId: string): Promise<CsvBatch | null> {
  if (!adminUuidSchema.safeParse(batchId).success) {
    return null;
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("csv_import_batches")
    .select("id, admin_id, type, status, rows, created_at, applied_at")
    .eq("id", batchId)
    .maybeSingle();

  requireQuerySuccess(error, "CSV 업로드 조회에 실패했습니다.");

  if (!data) {
    return null;
  }

  const typeResult = zCsvBatchType.safeParse(data.type);
  const statusResult = zCsvBatchStatus.safeParse(data.status);
  const adminIdResult = adminUuidSchema.safeParse(data.admin_id);
  if (!typeResult.success || !statusResult.success || !adminIdResult.success) {
    throw new InvalidCsvBatchError();
  }
  const rowsResult = parseCsvBatchRows(typeResult.data, data.rows);
  if (!rowsResult.success) {
    throw new InvalidCsvBatchError();
  }

  return {
    id: data.id,
    adminId: adminIdResult.data,
    type: typeResult.data,
    status: statusResult.data,
    rows: rowsResult.data,
    createdAt: data.created_at,
    appliedAt: data.applied_at,
  };
}
