"use client";

import { buttonStyles } from "@/components/ui/Button";
import { FeedbackState } from "@/components/ui/FeedbackState";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-7xl items-center justify-center py-8">
      <FeedbackState
        tone="error"
        title="문제가 발생했어요"
        description="잠시 후 다시 시도해 주세요."
        action={
          <button type="button" className={buttonStyles({ variant: "secondary" })} onClick={reset}>
            다시 시도
          </button>
        }
      />
    </main>
  );
}
