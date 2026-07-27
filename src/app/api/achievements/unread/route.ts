import { NextResponse } from "next/server";
import { getCurrentEmployee } from "@/lib/auth/session";
import { fetchAndMarkUnreadAchievements } from "@/lib/achievements/queries";

export async function GET() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return NextResponse.json({ achievements: [] });
  }

  const achievements = await fetchAndMarkUnreadAchievements(employee.id);
  return NextResponse.json({ achievements });
}
