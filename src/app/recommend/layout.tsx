import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";

export default async function RecommendLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const employee = await getCurrentEmployee();

  if (!employee) {
    redirect("/login");
  }

  return <>{children}</>;
}
