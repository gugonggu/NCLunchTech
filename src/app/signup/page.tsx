"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export default function SignupPage() {
  const router = useRouter();
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

      router.push("/");
      router.refresh();
    } catch {
      setMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-xl font-bold text-brand-dark">회원가입</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          className="rounded-2xl border border-neutral-200 px-4 py-3"
          placeholder="초대코드"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          required
        />
        <input
          className="rounded-2xl border border-neutral-200 px-4 py-3"
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
        />
        <input
          className="rounded-2xl border border-neutral-200 px-4 py-3"
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="PIN 4자리"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          required
        />
        <input
          className="rounded-2xl border border-neutral-200 px-4 py-3"
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="PIN 확인"
          value={pinConfirm}
          onChange={(e) => setPinConfirm(e.target.value)}
          required
        />
        {message && <p className="text-sm text-red-600">{message}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-2xl bg-brand px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          가입하기
        </button>
      </form>
      <p className="text-center text-sm text-neutral-500">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="text-brand-dark underline">
          로그인
        </Link>
      </p>
    </main>
  );
}
