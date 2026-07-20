"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "홈", icon: "⌂" },
  { href: "/restaurants", label: "식당 찾기", icon: "⌕" },
  { href: "/collection", label: "도감", icon: "▦" },
  { href: "/me", label: "내 정보", icon: "●" },
] as const;

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNavigation() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname === "/login" || pathname === "/signup") {
    return null;
  }

  return (
    <>
      <div aria-hidden className="h-[calc(4.5rem+env(safe-area-inset-bottom))] shrink-0" />
      <nav
        aria-label="하단 내비게이션"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto grid w-full max-w-md grid-cols-4 border-t border-orange-100 bg-white/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur"
      >
        {ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-1 py-1 text-xs font-semibold ${
                active ? "bg-orange-50 text-brand" : "text-neutral-400"
              }`}
            >
              <span aria-hidden className="text-xl leading-none">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
