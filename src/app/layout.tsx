import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentEmployee } from "@/lib/auth/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "앤시점심기술",
  description: "앤시정보기술 사내 점심 추천 서비스",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const employee = await getCurrentEmployee();

  return (
    <html lang="ko">
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
        >
          본문 바로가기
        </a>
        {employee ? (
          <AppShell>{children}</AppShell>
        ) : (
          <div id="main-content" className="flex min-h-dvh flex-col">
            {children}
          </div>
        )}
      </body>
    </html>
  );
}
