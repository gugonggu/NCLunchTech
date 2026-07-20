"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/auth/admin-log";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hashPin } from "@/lib/auth/pin";
import { pinSchema } from "@/lib/auth/validation";

async function revokeAllSessions(employeeId: string) {
  const supabase = createServiceRoleClient();
  await supabase
    .from("employee_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("employee_id", employeeId)
    .is("revoked_at", null);
}

export async function resetEmployeePin(employeeId: string, formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const parsed = pinSchema.safeParse(formData.get("newPin"));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "PIN이 올바르지 않습니다.");
  }

  const supabase = createServiceRoleClient();
  const pinHash = await hashPin(parsed.data);

  const { error } = await supabase
    .from("employees")
    .update({ pin_hash: pinHash, failed_login_count: 0, locked_until: null })
    .eq("id", employeeId);

  if (error) {
    throw new Error("PIN 초기화에 실패했습니다.");
  }

  await revokeAllSessions(employeeId);
  await logAdminAction(admin.id, "reset_employee_pin", { targetType: "employee", targetId: employeeId });

  revalidatePath("/admin/employees");
}

export async function setEmployeeActive(employeeId: string, isActive: boolean) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("employees")
    .update({
      is_active: isActive,
      deactivated_at: isActive ? null : new Date().toISOString(),
    })
    .eq("id", employeeId);

  if (error) {
    throw new Error("상태 변경에 실패했습니다.");
  }

  if (!isActive) {
    await revokeAllSessions(employeeId);
  }

  await logAdminAction(admin.id, isActive ? "reactivate_employee" : "deactivate_employee", {
    targetType: "employee",
    targetId: employeeId,
  });

  revalidatePath("/admin/employees");
}
