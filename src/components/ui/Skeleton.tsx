import type { HTMLAttributes, ReactElement } from "react";
import { cx } from "./cx";

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={cx(
        "animate-pulse rounded-control bg-surface-muted motion-reduce:animate-none",
        className,
      )}
    />
  );
}
