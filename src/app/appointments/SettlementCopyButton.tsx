"use client";

import { useState } from "react";

export function SettlementCopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm font-semibold"
      >
        정산 결과 복사하기
      </button>
      {state === "copied" && <p className="text-xs text-green-700">정산 결과를 복사했어요.</p>}
      {state === "failed" && <p className="text-xs text-red-600">복사에 실패했어요. 직접 선택해 복사해주세요.</p>}
    </div>
  );
}
