import type { ReactNode } from "react";

export function RestaurantsMapWorkspace({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="relative z-20 shrink-0 bg-surface/95 shadow-card backdrop-blur">{header}</div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </main>
  );
}
