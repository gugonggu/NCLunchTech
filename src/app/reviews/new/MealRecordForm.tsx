"use client";

import { useState } from "react";
import type { MealRecord } from "@/lib/meals/queries";
import type { MealSource } from "@/lib/meals/validation";
import { upsertMealRecord } from "./actions";

interface MealRecordFormProps {
  restaurantId: string;
  source: MealSource;
  menuItems: { id: string; name: string; price: number | null }[];
  existing: MealRecord | null;
}

export function MealRecordForm({ restaurantId, source, menuItems, existing }: MealRecordFormProps) {
  const selectedMenuStillExists = Boolean(
    existing?.menuItemId && menuItems.some((item) => item.id === existing.menuItemId)
  );
  const [selectedMenuId, setSelectedMenuId] = useState(
    selectedMenuStillExists ? existing?.menuItemId ?? "" : ""
  );

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-orange-50 p-4">
      <div>
        <h2 className="font-bold text-brand-dark">먹은 메뉴 기록</h2>
        <p className="text-sm text-neutral-500">등록 메뉴 하나를 고르거나 직접 입력해주세요.</p>
      </div>

      <form
        action={upsertMealRecord.bind(null, restaurantId, source.visitId, source.appointmentId)}
        className="flex flex-col gap-3"
      >
        <label className="flex flex-col gap-1 text-sm text-neutral-600">
          등록 메뉴
          <select
            name="menuItemId"
            value={selectedMenuId}
            onChange={(event) => setSelectedMenuId(event.target.value)}
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900"
          >
            <option value="">직접 입력</option>
            {menuItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.price !== null ? ` · ${item.price.toLocaleString("ko-KR")}원` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-neutral-600">
          직접 입력 메뉴명
          <input
            type="text"
            name="customMenuName"
            maxLength={100}
            disabled={selectedMenuId !== ""}
            defaultValue={existing && !selectedMenuStillExists ? existing.menuName : ""}
            placeholder="등록 메뉴를 고르지 않았다면 입력"
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-neutral-600">
          실제 지불 가격
          <input
            type="number"
            name="paidPrice"
            min={0}
            max={10_000_000}
            step={1}
            required
            defaultValue={existing?.paidPrice ?? ""}
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900"
          />
        </label>

        <button type="submit" className="rounded-2xl bg-brand px-4 py-3 font-semibold text-white">
          {existing ? "메뉴 기록 수정" : "메뉴 기록 저장"}
        </button>
      </form>
    </section>
  );
}
