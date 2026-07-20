import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { getCsvBatch } from "@/lib/admin/csv-batches";
import { CSV_IMPORT_STATUS_MESSAGES, isCsvImportStatusCode } from "@/lib/admin/csv-messages";
import type { MenuCsvRow } from "@/lib/admin/csv-menu";
import type { HoursCsvRow } from "@/lib/admin/csv-hours";
import { applyCsvBatch } from "../actions";

export default async function CsvBatchPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const { batchId } = await params;
  const { status } = await searchParams;
  const batch = await getCsvBatch(batchId);

  if (!batch) {
    notFound();
  }

  const feedbackMessage = isCsvImportStatusCode(status) ? CSV_IMPORT_STATUS_MESSAGES[status] : null;
  const isMenu = batch.type === "menu";
  const menuRows = isMenu ? (batch.rows as MenuCsvRow[]) : [];
  const hoursRows = !isMenu ? (batch.rows as HoursCsvRow[]) : [];

  const errorCount = isMenu
    ? menuRows.filter((r) => r.errors.length > 0).length
    : hoursRows.filter((r) => r.errors.length > 0).length;
  const newCount = isMenu
    ? menuRows.filter((r) => r.errors.length === 0 && r.isNew).length
    : hoursRows.filter((r) => r.errors.length === 0 && r.isNew).length;
  const updateCount = isMenu
    ? menuRows.filter((r) => r.errors.length === 0 && !r.isNew).length
    : hoursRows.filter((r) => r.errors.length === 0 && !r.isNew).length;
  const validCount = newCount + updateCount;

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-12">
      <Link href="/admin/restaurants/import" className="text-sm text-neutral-500">
        ← 업로드로
      </Link>

      <h1 className="text-xl font-bold text-brand-dark">{isMenu ? "메뉴" : "영업시간"} 업로드 미리보기</h1>

      {feedbackMessage && <p className="text-sm text-brand-dark">{feedbackMessage}</p>}

      <p className="text-sm text-neutral-600">
        신규 {newCount}건 · 수정 {updateCount}건 · 오류 {errorCount}건
      </p>

      {batch.status === "applied" ? (
        <p className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
          이미 반영된 업로드예요({batch.appliedAt}).
        </p>
      ) : (
        <form action={applyCsvBatch.bind(null, batchId)}>
          <button
            type="submit"
            disabled={validCount === 0}
            className="rounded-2xl bg-brand px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            반영({validCount}건)
          </button>
        </form>
      )}

      <ul className="flex flex-col gap-2">
        {isMenu
          ? menuRows.map((row) => (
              <li
                key={row.rowNumber}
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  row.errors.length > 0 ? "border-red-300 bg-red-50" : "border-neutral-200"
                }`}
              >
                <p className="font-semibold">
                  {row.rowNumber}행 · {row.restaurantName ?? row.kakaoPlaceId} · {row.name} ·{" "}
                  {row.price !== null ? `${row.price}원` : "가격 없음"}
                  {row.errors.length === 0 && (row.isNew ? " · 신규" : " · 수정")}
                </p>
                {row.errors.map((e, i) => (
                  <p key={i} className="text-red-600">
                    {e}
                  </p>
                ))}
              </li>
            ))
          : hoursRows.map((row) => (
              <li
                key={row.rowNumber}
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  row.errors.length > 0 ? "border-red-300 bg-red-50" : "border-neutral-200"
                }`}
              >
                <p className="font-semibold">
                  {row.rowNumber}행 · {row.restaurantName ?? row.kakaoPlaceId} · 요일 {row.dayOfWeek ?? "?"} ·{" "}
                  {row.isClosed ? "휴무" : `${row.openTime}~${row.closeTime}`}
                  {row.errors.length === 0 && (row.isNew ? " · 신규" : " · 수정")}
                </p>
                {row.errors.map((e, i) => (
                  <p key={i} className="text-red-600">
                    {e}
                  </p>
                ))}
              </li>
            ))}
      </ul>
    </main>
  );
}
