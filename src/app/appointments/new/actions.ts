"use server";

import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolveEmployeesByNickname } from "@/lib/appointments/queries";
import { memoSchema, parseNicknameList, parseSeoulDateTimeLocal } from "@/lib/appointments/validation";
import { createNotification } from "@/lib/notifications/queries";
import { buildAppointmentInvitedMessage } from "@/lib/notifications/validation";

function redirectToNewForm(restaurantId: string, status: string): never {
  redirect(`/appointments/new?restaurantId=${restaurantId}&status=${status}`);
}

export async function createAppointment(restaurantId: string, formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/appointments/new?restaurantId=${restaurantId}`)}`);
  }

  const supabase = createServiceRoleClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, is_active")
    .eq("id", restaurantId)
    .maybeSingle();

  if (!restaurant) {
    redirectToNewForm(restaurantId, "not_found");
  }
  if (!restaurant.is_active) {
    redirectToNewForm(restaurantId, "inactive_restaurant");
  }

  const scheduledAt = parseSeoulDateTimeLocal(String(formData.get("scheduledAt") ?? ""));
  if (!scheduledAt || scheduledAt.getTime() <= Date.now()) {
    redirectToNewForm(restaurantId, "invalid_time");
  }

  const parsedMemo = memoSchema.safeParse(formData.get("memo"));
  if (!parsedMemo.success) {
    redirectToNewForm(restaurantId, "invalid_memo");
  }

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      host_employee_id: employee.id,
      restaurant_id: restaurantId,
      scheduled_at: scheduledAt.toISOString(),
      memo: parsedMemo.data ?? null,
    })
    .select("id")
    .single();

  if (error || !appointment) {
    throw new Error("약속 생성에 실패했습니다.");
  }

  const nicknames = parseNicknameList(String(formData.get("participantNicknames") ?? ""));
  if (nicknames.length > 0) {
    const matchedEmployees = await resolveEmployeesByNickname(nicknames, employee.id);
    if (matchedEmployees.length > 0) {
      await supabase.from("appointment_participants").insert(
        matchedEmployees.map((e) => ({
          appointment_id: appointment.id,
          employee_id: e.id,
          status: "pending",
        }))
      );

      const message = buildAppointmentInvitedMessage(restaurant.name);
      await Promise.all(
        matchedEmployees.map((e) =>
          createNotification({
            employeeId: e.id,
            type: "appointment_invited",
            message,
            relatedAppointmentId: appointment.id,
          })
        )
      );
    }
  }

  redirect(`/appointments/${appointment.id}?status=created`);
}
