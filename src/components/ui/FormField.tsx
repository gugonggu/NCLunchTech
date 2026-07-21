import { cloneElement, type ReactElement } from "react";

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string | null;
  children: ReactElement<{ "aria-describedby"?: string }>;
}): ReactElement {
  const describedBy = [
    children.props["aria-describedby"],
    hint && `${htmlFor}-hint`,
    error && `${htmlFor}-error`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-ink" htmlFor={htmlFor}>
        {label}
      </label>
      {cloneElement(children, {
        "aria-describedby": describedBy || undefined,
      })}
      {hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
