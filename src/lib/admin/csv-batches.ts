import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { MenuCsvRow } from "./csv-menu";
import type { HoursCsvRow } from "./csv-hours";

export type CsvBatchType = "menu" | "hours";
export type CsvBatchStatus = "pending" | "applied";

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
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("csv_import_batches")
    .insert({ admin_id: adminId, type, rows })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("CSV 업로드 저장에 실패했습니다.");
  }

  return data.id;
}

export async function getCsvBatch(batchId: string): Promise<CsvBatch | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("csv_import_batches")
    .select("id, admin_id, type, status, rows, created_at, applied_at")
    .eq("id", batchId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    adminId: data.admin_id,
    type: data.type as CsvBatchType,
    status: data.status as CsvBatchStatus,
    rows: data.rows,
    createdAt: data.created_at,
    appliedAt: data.applied_at,
  };
}

export async function markCsvBatchApplied(batchId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase
    .from("csv_import_batches")
    .update({ status: "applied", applied_at: new Date().toISOString() })
    .eq("id", batchId)
    .eq("status", "pending");
}
