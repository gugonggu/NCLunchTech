import Link from "next/link";
import type { ManagedMealRecord } from "@/lib/meals/queries";
import { deleteMealRecord } from "@/app/me/meal-records/actions";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" });

export function MealRecordList({ records }: { records: ManagedMealRecord[] }) {
  return (
    <section className="rounded-card bg-surface px-4 py-4 shadow-card" aria-label="식사 기록">
      <h2 className="text-base font-bold text-ink">식사 기록</h2>
      {records.length === 0 ? <p className="mt-2 text-sm text-ink-muted">아직 기록한 식사가 없어요.</p> : (
        <ul className="mt-3 flex flex-col gap-3">
          {records.map((record) => (
            <li key={record.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
              <p className="font-semibold text-ink">{record.restaurantName}</p>
              <p className="mt-1 text-sm text-ink-muted">{record.menuName} · {record.paidPrice.toLocaleString("ko-KR")}원</p>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-ink-muted">{dateFormatter.format(new Date(record.createdAt))}</span>
                <div className="flex gap-3 font-semibold">
                  <Link href={`/me/meal-records/${record.id}`} className="text-brand-dark">수정</Link>
                  <form action={deleteMealRecord.bind(null, record.id)}><button type="submit" className="text-danger">삭제</button></form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
