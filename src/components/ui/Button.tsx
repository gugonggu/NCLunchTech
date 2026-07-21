import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "default" | "compact";

export function buttonStyles(
  {
    variant = "primary",
    size = "default",
    block = false,
  }: { variant?: Variant; size?: Size; block?: boolean } = {},
) {
  return cx(
    "inline-flex min-w-0 items-center justify-center gap-2 rounded-control px-4 font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
    size === "default" ? "min-h-12 text-sm" : "min-h-10 text-sm",
    variant === "primary" &&
      "bg-brand text-white hover:bg-brand-dark active:bg-brand-dark",
    variant === "secondary" &&
      "border border-line bg-surface text-ink hover:bg-surface-muted",
    variant === "ghost" &&
      "bg-transparent text-ink-muted hover:bg-brand-soft hover:text-brand-dark",
    variant === "danger" && "bg-danger-soft text-danger hover:bg-red-100",
    block && "w-full",
  );
}

export function Button({
  className,
  variant,
  size,
  block,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}) {
  return (
    <button
      className={cx(buttonStyles({ variant, size, block }), className)}
      {...props}
    />
  );
}
