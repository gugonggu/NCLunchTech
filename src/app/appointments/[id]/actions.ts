"use server";

import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAppointmentDetail, getMyParticipant } from "@/lib/appointments/queries";
import { canParticipantTransition, memoSchema, parseSeoulDateTimeLocal } from "@/lib/appointments/validation";

function redirectWithStatus(appointmentId: string, status: string): never {
  redirect(`/appointments/${appointmentId}?status=${status}`);
}

async function requireOpenAppointment(appointmentId: string) {
  const appointment = await getAppointmentDetail(appointmentId);
  if (!appointment) {
    redirectWithStatus(appointmentId, "not_found");
  }
  if (appointment.status === "cancelled") {
    redirectWithStatus(appointmentId, "cancelled_appointment");
  }
  if (new Date(appointment.scheduledAt) <= new Date()) {
    redirectWithStatus(appointmentId, "expired");
  }
  return appointment;
}

export async function respondToInvite(appointmentId: string, response: "accepted" | "declined") {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/appointments/${appointmentId}`)}`);
  }

  const appointment = await requireOpenAppointment(appointmentId);
  if (appointment.hostEmployeeId === employee.id) {
    redirectWithStatus(appointmentId, "not_host");
  }

  const supabase = createServiceRoleClient();
  const existing = await getMyParticipant(appointmentId, employee.id);
  const now = new Date().toISOString();

  if (existing) {
    if (!canParticipantTransition(existing.status, response)) {
      redirectWithStatus(appointmentId, "already_responded");
    }

    const { error } = await supabase
      .from("appointment_participants")
      .update({ status: response, responded_at: now, updated_at: now })
      .eq("id", existing.id)
      .eq("status", "pending");

    if (error) {
      throw new Error("응답 처리에 실패했습니다.");
    }
  } else {
    const { error } = await supabase.from("appointment_participants").insert({
      appointment_id: appointmentId,
      employee_id: employee.id,
      status: response,
      responded_at: now,
    });

    if (error) {
      // 동시 요청으로 그 사이 참여자 행이 이미 생겼을 수 있다(유일 제약 충돌).
      if (error.code === "23505") {
        redirectWithStatus(appointmentId, "already_responded");
      }
      throw new Error("응답 처리에 실패했습니다.");
    }
  }

  redirectWithStatus(appointmentId, response);
}

export async function withdrawParticipation(appointmentId: string) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/appointments/${appointmentId}`)}`);
  }

  const existing = await getMyParticipant(appointmentId, employee.id);
  if (!existing || !canParticipantTransition(existing.status, "cancelled")) {
    redirectWithStatus(appointmentId, "already_responded");
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("appointment_participants")
    .update({ status: "cancelled", updated_at: now })
    .eq("id", existing.id)
    .eq("status", "accepted");

  if (error) {
    throw new Error("참여 취소에 실패했습니다.");
  }

  redirectWithStatus(appointmentId, "withdrawn");
}

export async function cancelAppointment(appointmentId: string) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/appointments/${appointmentId}`)}`);
  }

  const appointment = await getAppointmentDetail(appointmentId);
  if (!appointment) {
    redirectWithStatus(appointmentId, "not_found");
  }
  if (appointment.hostEmployeeId !== employee.id) {
    redirectWithStatus(appointmentId, "not_host");
  }
  if (appointment.status === "cancelled") {
    redirectWithStatus(appointmentId, "cancelled_appointment");
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled", cancelled_at: now, updated_at: now })
    .eq("id", appointmentId)
    .eq("host_employee_id", employee.id)
    .eq("status", "active");

  if (error) {
    throw new Error("약속 취소에 실패했습니다.");
  }

  redirectWithStatus(appointmentId, "cancelled");
}

export async function updateAppointmentSchedule(appointmentId: string, formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/appointments/${appointmentId}`)}`);
  }

  const appointment = await requireOpenAppointment(appointmentId);
  if (appointment.hostEmployeeId !== employee.id) {
    redirectWithStatus(appointmentId, "not_host");
  }

  const scheduledAt = parseSeoulDateTimeLocal(String(formData.get("scheduledAt") ?? ""));
  if (!scheduledAt || scheduledAt.getTime() <= Date.now()) {
    redirectWithStatus(appointmentId, "invalid_time");
  }

  const parsedMemo = memoSchema.safeParse(formData.get("memo"));
  if (!parsedMemo.success) {
    redirectWithStatus(appointmentId, "invalid_memo");
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("appointments")
    .update({
      scheduled_at: scheduledAt.toISOString(),
      memo: parsedMemo.data ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .eq("host_employee_id", employee.id)
    .eq("status", "active");

  if (error) {
    throw new Error("약속 정보 변경에 실패했습니다.");
  }

  redirectWithStatus(appointmentId, "updated");
}

export async function changeAppointmentRestaurant(appointmentId: string, restaurantId: string) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect("/login");
  }

  const appointment = await requireOpenAppointment(appointmentId);
  if (appointment.hostEmployeeId !== employee.id) {
    redirectWithStatus(appointmentId, "not_host");
  }

  const supabase = createServiceRoleClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, is_active")
    .eq("id", restaurantId)
    .maybeSingle();

  if (!restaurant || !restaurant.is_active) {
    redirectWithStatus(appointmentId, "inactive_restaurant");
  }

  const { error } = await supabase
    .from("appointments")
    .update({ restaurant_id: restaurantId, updated_at: new Date().toISOString() })
    .eq("id", appointmentId)
    .eq("host_employee_id", employee.id)
    .eq("status", "active");

  if (error) {
    throw new Error("식당 변경에 실패했습니다.");
  }

  redirectWithStatus(appointmentId, "updated");
}
