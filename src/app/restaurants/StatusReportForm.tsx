"use client";

import { useActionState } from "react";
import { STATUS_REPORT_IDLE_STATE, type StatusReportActionState } from "@/lib/status-reports/validation";

/**
 * 혼잡도/영업 상태 제보 버튼들을 감싸는 확인창 + 진행 상태 + 결과 안내 컴포넌트.
 * 버튼 자체가 name="value"인 submit 버튼이라 어떤 값을 눌렀는지가 FormData에 그대로 실린다.
 * confirm()에서 취소하면 preventDefault로 폼 제출 자체가 발생하지 않아 서버 요청이 안 나간다.
 */
export function StatusReportForm({
  values,
  action,
  layout = "row",
}: {
  values: readonly string[];
  action: (state: StatusReportActionState, formData: FormData) => Promise<StatusReportActionState>;
  layout?: "row" | "grid";
}) {
  const [state, formAction, isPending] = useActionState(action, STATUS_REPORT_IDLE_STATE);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const value = submitter?.value;
    if (!value) {
      e.preventDefault();
      return;
    }
    const confirmed = window.confirm(
      `"${value}" 상태로 제보할까요?\n직원 제보 정보이므로 실제 상태와 다를 수 있어요.`
    );
    if (!confirmed) {
      e.preventDefault();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <form
        action={formAction}
        onSubmit={handleSubmit}
        className={layout === "grid" ? "grid grid-cols-2 gap-2" : "flex gap-2"}
      >
        {values.map((value) => (
          <button
            key={value}
            type="submit"
            name="value"
            value={value}
            disabled={isPending}
            className={`${layout === "row" ? "flex-1" : ""} rounded-xl bg-neutral-100 px-3 py-2 text-sm font-semibold disabled:opacity-50`}
          >
            {isPending ? "저장 중..." : value}
          </button>
        ))}
      </form>
      {state.status === "success" && <p className="text-xs text-green-700">{state.message}</p>}
      {state.status === "error" && <p className="text-xs text-red-600">{state.message}</p>}
    </div>
  );
}
