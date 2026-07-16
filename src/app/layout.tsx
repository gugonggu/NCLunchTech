import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "앤시점심기술",
  description: "앤시정보기술 사내 점심 추천 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white">
          {children}
        </div>
      </body>
    </html>
  );
}
