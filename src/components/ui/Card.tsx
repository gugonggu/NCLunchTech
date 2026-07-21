import type { HTMLAttributes, ReactElement } from "react";
import { cx } from "./cx";

type Tone = "surface" | "muted" | "accent";
type Padding = "none" | "compact" | "default";

export function Card({
  className,
  tone = "surface",
  padding = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  tone?: Tone;
  padding?: Padding;
}): ReactElement {
  return (
    <div
      className={cx(
        "rounded-card",
        tone === "surface" && "bg-surface shadow-card",
        tone === "muted" && "bg-surface-muted",
        tone === "accent" && "bg-brand-soft",
        padding === "compact" && "p-4",
        padding === "default" && "p-5",
        className,
      )}
      {...props}
    />
  );
}
