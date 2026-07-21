import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh bg-canvas lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden bg-brand p-12 text-black lg:flex lg:flex-col lg:justify-end">
        <p className="text-sm font-semibold">앤시점심기술</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight">점심을 함께, 더 가깝게</h1>
      </section>
      <section className="flex min-h-dvh items-center justify-center p-6 sm:p-10">{children}</section>
    </main>
  );
}
