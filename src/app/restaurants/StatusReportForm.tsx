"use client";

import { useState } from "react";
import { useActionState } from "react";
import { STATUS_REPORT_IDLE_STATE, type StatusReportActionState } from "@/lib/status-reports/validation";

/**
 * 혼잡도/영업 상태 제보 버튼들을 감싸는 인라인 확인 + 진행 상태 + 결과 안내 컴포넌트.
 * 버튼을 누르면 바로 제출하지 않고 인라인 확인 문구를 보여준 뒤, "제보하기"를 눌러야 실제 폼이 제출된다.
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

  return (
    <StatusReportFormBody
      key={`${state.status}:${state.message ?? ""}`}
      values={values}
      formAction={formAction}
      isPending={isPending}
      state={state}
      layout={layout}
    />
  );
}

function StatusReportFormBody({
  values,
  formAction,
  isPending,
  state,
  layout,
}: {
  values: readonly string[];
  formAction: (formData: FormData) => void;
  isPending: boolean;
  state: StatusReportActionState;
  layout: "row" | "grid";
}) {
  const [pendingValue, setPendingValue] = useState<string | null>(null);

  if (pendingValue) {
    return (
      <div className="flex flex-col gap-2 rounded-control border border-line bg-surface-muted p-3 text-sm">
        <p className="text-ink">
          &ldquo;{pendingValue}&rdquo; 상태로 제보할까요?
          <br />
          직원 제보 정보이므로 실제 상태와 다를 수 있어요.
        </p>
        <form action={formAction} className="flex gap-2">
          <input type="hidden" name="value" value={pendingValue} />
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-control bg-brand px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {isPending ? "저장 중..." : "제보하기"}
          </button>
          <button
            type="button"
            onClick={() => setPendingValue(null)}
            className="flex-1 rounded-control border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink"
          >
            취소
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className={layout === "grid" ? "grid grid-cols-2 gap-2" : "flex gap-2"}>
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setPendingValue(value)}
            className={`${layout === "row" ? "flex-1" : ""} rounded-xl bg-surface-muted px-3 py-2 text-sm font-semibold transition-colors hover:bg-line`}
          >
            {value}
          </button>
        ))}
      </div>
      {state.status === "success" && <p className="text-xs text-success">{state.message}</p>}
      {state.status === "error" && <p className="text-xs text-danger">{state.message}</p>}
    </div>
  );
}
