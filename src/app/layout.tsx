import type { Metadata } from "next";
import { getCurrentEmployee } from "@/lib/auth/session";
import { BottomNavigation } from "./BottomNavigation";
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
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white">
          {children}
          {employee && <BottomNavigation />}
        </div>
      </body>
    </html>
  );
}
