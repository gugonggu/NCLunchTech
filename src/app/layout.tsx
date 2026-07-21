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
        {employee ? <AppShell>{children}</AppShell> : children}
      </body>
    </html>
  );
}
