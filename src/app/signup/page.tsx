"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useState } from "react";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { sanitizeReturnTo } from "@/lib/appointments/validation";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));
  const [inviteCode, setInviteCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode, nickname, pin, pinConfirm }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setMessage(data.message ?? "가입에 실패했습니다.");
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
          <h1 className="text-2xl font-bold text-ink">회원가입</h1>
          <p className="text-sm text-ink-muted">
            점심 결정, 이제 1~2분이면 충분해요.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField label="초대코드" htmlFor="signup-code">
            <input
              id="signup-code"
              className="w-full rounded-control border border-line bg-surface px-4 py-3 text-ink"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              aria-describedby={message ? "signup-error" : undefined}
              required
            />
          </FormField>
          <FormField label="닉네임" htmlFor="signup-nickname">
            <input
              id="signup-nickname"
              className="w-full rounded-control border border-line bg-surface px-4 py-3 text-ink"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              aria-describedby={message ? "signup-error" : undefined}
              required
            />
          </FormField>
          <FormField label="PIN 4자리" htmlFor="signup-pin">
            <input
              id="signup-pin"
              className="w-full rounded-control border border-line bg-surface px-4 py-3 text-ink"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              aria-describedby={message ? "signup-error" : undefined}
              required
            />
          </FormField>
          <FormField label="PIN 확인" htmlFor="signup-pin-confirm">
            <input
              id="signup-pin-confirm"
              className="w-full rounded-control border border-line bg-surface px-4 py-3 text-ink"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value)}
              aria-describedby={message ? "signup-error" : undefined}
              required
            />
          </FormField>
          {message && (
            <div
              id="signup-error"
              role="alert"
              className="rounded-control bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              {message}
            </div>
          )}
          <Button type="submit" block disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? "가입하고 있어요" : "가입하기"}
          </Button>
        </form>
        <p className="text-center text-sm text-ink-muted">
          이미 계정이 있나요?{" "}
          <Link
            href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
            className="inline-flex min-h-11 min-w-11 font-semibold text-brand-dark underline"
          >
            로그인
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
