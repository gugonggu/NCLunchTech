import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { CSV_IMPORT_STATUS_MESSAGES, isCsvImportStatusCode } from "@/lib/admin/csv-messages";
import { uploadHoursCsv, uploadMenuCsv } from "./actions";

export default async function CsvImportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const { status } = await searchParams;
  const feedbackMessage = isCsvImportStatusCode(status) ? CSV_IMPORT_STATUS_MESSAGES[status] : null;

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-12">
      <Link href="/admin/restaurants" className="text-sm text-ink-muted">
        ← 식당 관리로
      </Link>

      <h1 className="text-xl font-bold text-brand-dark">CSV 업로드</h1>

      {feedbackMessage && <p className="text-sm text-red-600">{feedbackMessage}</p>}

      <section className="flex flex-col gap-2">
        <h2 className="font-bold text-brand-dark">메뉴·가격</h2>
        <p className="text-xs text-ink-muted">헤더: kakao_place_id,name,price (price는 비워도 됩니다)</p>
        <Link href="/templates/menu-import-template.csv" download className="text-sm font-semibold text-brand underline">
          메뉴 CSV 템플릿 받기
        </Link>
        <form action={uploadMenuCsv} className="flex flex-col gap-2" encType="multipart/form-data">
          <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
          <button type="submit" className="rounded-control bg-brand px-4 py-3 font-semibold text-black">
            업로드하고 미리보기
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold text-brand-dark">영업시간</h2>
        <p className="text-xs text-ink-muted">
          헤더: kakao_place_id,day_of_week,is_closed,open_time,close_time (day_of_week는 0=일요일~6=토요일)
        </p>
        <Link href="/templates/hours-import-template.csv" download className="text-sm font-semibold text-brand underline">
          영업시간 CSV 템플릿 받기
        </Link>
        <form action={uploadHoursCsv} className="flex flex-col gap-2" encType="multipart/form-data">
          <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
          <button type="submit" className="rounded-control bg-brand px-4 py-3 font-semibold text-black">
            업로드하고 미리보기
          </button>
        </form>
      </section>
    </main>
  );
}
