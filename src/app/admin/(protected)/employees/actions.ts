"use server";

import { redirect } from "next/navigation";
import { parseAdminRpcStatus } from "@/lib/admin/rpc-result";
import { adminUuidSchema } from "@/lib/admin/validation";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hashPin } from "@/lib/auth/pin";
import { pinSchema } from "@/lib/auth/validation";

export async function resetEmployeePin(employeeId: string, formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  if (!adminUuidSchema.safeParse(employeeId).success) {
    redirect("/admin/employees?status=invalid_target");
  }

  const parsed = pinSchema.safeParse(formData.get("newPin"));
  if (!parsed.success) {
    redirect("/admin/employees?status=pin_invalid");
  }

  const supabase = createServiceRoleClient();
  const pinHash = await hashPin(parsed.data);

  const { data, error } = await supabase.rpc("admin_reset_employee_pin", {
    p_admin_id: admin.id,
    p_employee_id: employeeId,
    p_pin_hash: pinHash,
  });

  if (error) {
    throw new Error("PIN 초기화에 실패했습니다.");
  }
  const status = parseAdminRpcStatus(data, ["pin_reset", "target_not_found"]);
  redirect(`/admin/employees?status=${status}`);
}

export async function setEmployeeActive(employeeId: string, isActive: boolean) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  if (!adminUuidSchema.safeParse(employeeId).success || typeof isActive !== "boolean") {
    redirect("/admin/employees?status=invalid_target");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("admin_set_employee_active", {
    p_admin_id: admin.id,
    p_employee_id: employeeId,
    p_is_active: isActive,
  });

  if (error) {
    throw new Error("상태 변경에 실패했습니다.");
  }
  const status = parseAdminRpcStatus(data, ["reactivated", "deactivated", "target_not_found"]);
  redirect(`/admin/employees?status=${status}`);
}
