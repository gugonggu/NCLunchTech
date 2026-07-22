"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getSeoulDateString } from "@/lib/visits/validation";
import { isLunchAvailabilityStatus, type LunchAvailabilityStatus } from "@/lib/lunch-availability/validation";

export async function setMyLunchAvailability(status: LunchAvailabilityStatus) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect("/login");
  }
  if (!isLunchAvailabilityStatus(status)) {
    throw new Error("점심 상태가 올바르지 않습니다.");
  }

  const now = new Date();
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("lunch_availabilities").upsert(
    {
      employee_id: employee.id,
      availability_date: getSeoulDateString(now),
      status,
      updated_at: now.toISOString(),
    },
    { onConflict: "employee_id,availability_date" },
  );

  if (error) {
    throw new Error("점심 상태 저장에 실패했습니다.");
  }

  revalidatePath("/");
}

export async function clearMyLunchAvailability() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect("/login");
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("lunch_availabilities")
    .delete()
    .eq("employee_id", employee.id)
    .eq("availability_date", getSeoulDateString(new Date()));

  if (error) {
    throw new Error("점심 상태 해제에 실패했습니다.");
  }

  revalidatePath("/");
}
