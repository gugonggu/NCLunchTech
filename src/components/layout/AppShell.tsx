import type { ReactNode } from "react";
import { AppNavigation } from "./AppNavigation";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <AppNavigation />
      <div
        id="main-content"
        className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:px-8 md:py-8 md:pb-0"
      >
        {children}
      </div>
    </div>
  );
}
