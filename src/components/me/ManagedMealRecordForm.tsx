"use client";

import { useState } from "react";
import type { ManagedMealRecord } from "@/lib/meals/queries";
import { buttonStyles } from "@/components/ui/Button";
import { updateMealRecord } from "@/app/me/meal-records/actions";

export function ManagedMealRecordForm({
  record,
  menuItems,
}: {
  record: ManagedMealRecord;
  menuItems: { id: string; name: string; price: number | null }[];
}) {
  const selectedMenuStillExists = Boolean(record.menuItemId && menuItems.some((item) => item.id === record.menuItemId));
  const [menuItemId, setMenuItemId] = useState(selectedMenuStillExists ? record.menuItemId ?? "" : "");

  return (
    <form action={updateMealRecord.bind(null, record.id)} className="flex flex-col gap-3 rounded-card bg-brand-soft p-4">
      <label className="flex flex-col gap-1 text-sm text-ink-muted">
        등록 메뉴
        <select name="menuItemId" value={menuItemId} onChange={(event) => setMenuItemId(event.target.value)} className="rounded-control border border-line bg-surface px-4 py-3 text-base text-ink">
          <option value="">직접 입력</option>
          {menuItems.map((item) => <option key={item.id} value={item.id}>{item.name}{item.price !== null ? ` · ${item.price.toLocaleString("ko-KR")}원` : ""}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink-muted">
        직접 입력 메뉴명
        <input name="customMenuName" maxLength={100} disabled={menuItemId !== ""} defaultValue={selectedMenuStillExists ? "" : record.menuName} className="rounded-control border border-line bg-surface px-4 py-3 text-base text-ink" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink-muted">
        실제 지불 가격
        <input type="number" name="paidPrice" min={0} max={10_000_000} step={1} required defaultValue={record.paidPrice} className="rounded-control border border-line bg-surface px-4 py-3 text-base text-ink" />
      </label>
      <button type="submit" className={buttonStyles({ block: true })}>식사 기록 저장</button>
    </form>
  );
}
