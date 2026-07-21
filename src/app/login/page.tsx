"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useState } from "react";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { sanitizeReturnTo } from "@/lib/appointments/validation";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, pin }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setMessage(data.message ?? "로그인에 실패했습니다.");
        return;
      }

      router.push(returnTo);
      router.refresh();
    } catch {
      setMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-ink">로그인</h1>
          <p className="text-sm text-ink-muted">
            점심 결정, 이제 1~2분이면 충분해요.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField label="닉네임" htmlFor="login-nickname">
            <input
              id="login-nickname"
              className="w-full rounded-control border border-line bg-surface px-4 py-3 text-ink"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
            />
          </FormField>
          <FormField label="PIN 4자리" htmlFor="login-pin">
            <input
              id="login-pin"
              className="w-full rounded-control border border-line bg-surface px-4 py-3 text-ink"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
          </FormField>
          {message && (
            <div
              role="alert"
              className="rounded-control bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              {message}
            </div>
          )}
          <Button type="submit" block disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? "확인하고 있어요" : "로그인"}
          </Button>
        </form>
        <p className="text-center text-sm text-ink-muted">
          아직 계정이 없나요?{" "}
          <Link
            href={`/signup?returnTo=${encodeURIComponent(returnTo)}`}
            className="font-semibold text-brand-dark underline"
          >
            회원가입
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
