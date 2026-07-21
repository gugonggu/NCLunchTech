import type { ReactNode, SVGProps } from "react";

export type AppIconName =
  | "home"
  | "restaurant"
  | "people"
  | "bell"
  | "profile"
  | "arrow"
  | "spark"
  | "map"
  | "check"
  | "refresh";

export function AppIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: AppIconName }) {
  const paths: Record<AppIconName, ReactNode> = {
    home: <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3Z" />,
    restaurant: (
      <>
        <path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M16 3v18M16 3c3 2 4 5 4 8h-4" />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3 21v-2a6 6 0 0 1 12 0v2M15 15a5 5 0 0 1 6 4.8V21" />
      </>
    ),
    bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    arrow: <path d="m9 18 6-6-6-6" />,
    spark: <path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4Z" />,
    map: (
      <>
        <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" />
        <path d="M9 3v15M15 6v15" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    refresh: (
      <>
        <path d="M20 7v5h-5" />
        <path d="M4 17v-5h5M6.1 7a8 8 0 0 1 13.2 3M17.9 17A8 8 0 0 1 4.7 14" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
