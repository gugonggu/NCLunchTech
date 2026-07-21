"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncKakaoButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  async function handleSync() {
    setIsSyncing(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/restaurants/sync-kakao", { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setMessage(data.message ?? "동기화에 실패했습니다.");
        return;
      }

      setMessage(
        `격자 ${data.result.gridPoints}곳 검색, 발견 ${data.result.found}건 중 신규 ${data.result.inserted}건 등록, ${data.result.skipped}건 중복`
      );
      router.refresh();
    } catch {
      setMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="rounded-control bg-brand px-4 py-3 font-semibold text-black disabled:opacity-50"
      >
        {isSyncing ? "가져오는 중..." : "카카오에서 식당 가져오기"}
      </button>
      {message && <p className="text-sm text-ink-muted">{message}</p>}
    </div>
  );
}
