import type { ReactElement, ReactNode } from "react";
import { cx } from "./cx";

export function FeedbackState({
  title,
  description,
  action,
  tone = "empty",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "empty" | "error";
}): ReactElement {
  return (
    <section
      className={cx(
        "rounded-card border p-5 text-center",
        tone === "empty" && "border-line bg-surface text-ink",
        tone === "error" && "border-danger bg-danger-soft text-danger",
      )}
      role={tone === "error" ? "alert" : undefined}
    >
      <h2 className="text-base font-semibold">{title}</h2>
      {description ? <p className="mt-2 text-sm">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}
