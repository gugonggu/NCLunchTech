"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonStyles } from "@/components/ui/Button";

export function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });

      if (!res.ok) {
        setError("로그아웃에 실패했습니다. 다시 시도해주세요.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button onClick={handleLogout} disabled={isSubmitting} className={buttonStyles({ block: true })}>
        {isSubmitting ? "로그아웃 중..." : "로그아웃"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
