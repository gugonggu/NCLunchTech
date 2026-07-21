"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppIcon, type AppIconName } from "@/components/icons/AppIcon";
import { cx } from "@/components/ui/cx";

export const NAV_ITEMS = [
  { href: "/", label: "홈", icon: "home" },
  { href: "/restaurants", label: "식당", icon: "restaurant" },
  { href: "/appointments/new", label: "같이 먹기", icon: "people" },
  { href: "/notifications", label: "알림", icon: "bell" },
  { href: "/me", label: "내 정보", icon: "profile" },
] as const satisfies ReadonlyArray<{ href: string; label: string; icon: AppIconName }>;

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "inline-flex min-w-11 items-center justify-center gap-2 rounded-control font-semibold transition-colors",
              mobile ? "flex-col px-1 py-1 text-xs" : "min-h-11 px-3 text-sm",
              active ? "bg-brand-soft text-brand-dark" : "text-ink-muted hover:bg-surface-muted hover:text-ink",
            )}
          >
            <AppIcon name={item.icon} className={mobile ? "size-5" : "size-4"} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

export function AppNavigation() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin") || pathname === "/login" || pathname === "/signup") {
    return null;
  }

  return (
    <>
      <header className="hidden border-b border-line bg-surface md:flex">
        <nav aria-label="주요 탐색" className="mx-auto flex w-full max-w-7xl items-center gap-2 px-8 py-3">
          <Link href="/" className="mr-auto text-base font-bold text-brand-dark">
            엔씨런치테크
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            <NavigationLinks />
          </div>
        </nav>
      </header>
      <nav
        aria-label="하단 탐색"
        className="fixed inset-x-0 bottom-0 z-50 grid w-full grid-cols-5 border-t border-line bg-surface/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
      >
        <NavigationLinks mobile />
      </nav>
    </>
  );
}
