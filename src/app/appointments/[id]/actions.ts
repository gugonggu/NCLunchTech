"use server";

import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getActiveParticipantEmployeeIds, createNotification } from "@/lib/notifications/queries";
import { buildAppointmentCancelledMessage, buildAppointmentUpdatedMessage } from "@/lib/notifications/validation";
import { getAppointmentDetail, getMyParticipant } from "@/lib/appointments/queries";
import { canParticipantTransition, memoSchema, parseSeoulDateTimeLocal } from "@/lib/appointments/validation";
import { getAttendanceTiming } from "@/lib/appointments/attendance";

function redirectWithStatus(appointmentId: string, status: string): never {
  redirect(`/appointments/${appointmentId}?status=${status}`);
}

async function notifyActiveParticipants(
  appointmentId: string,
  restaurantName: string,
  type: "appointment_updated" | "appointment_cancelled"
) {
  const participantIds = await getActiveParticipantEmployeeIds(appointmentId);
  const message =
    type === "appointment_updated"
      ? buildAppointmentUpdatedMessage(restaurantName)
      : buildAppointmentCancelledMessage(restaurantName);

  await Promise.all(
    participantIds.map((employeeId) =>
      createNotification({ employeeId, type, message, relatedAppointmentId: appointmentId })
    )
  );
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

export async function markParticipantNoShow(appointmentId: string) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/appointments/${appointmentId}`)}`);
  }

  const appointment = await getAppointmentDetail(appointmentId);
  if (!appointment) {
    redirectWithStatus(appointmentId, "not_found");
  }
  if (appointment.status === "cancelled") {
    redirectWithStatus(appointmentId, "cancelled_appointment");
  }
  if (getAttendanceTiming(appointment.scheduledAt, new Date()) === "too_early") {
    redirectWithStatus(appointmentId, "too_early");
  }

  const existing = await getMyParticipant(appointmentId, employee.id);
  if (!existing || !canParticipantTransition(existing.status, "cancelled")) {
    redirectWithStatus(appointmentId, "already_responded");
  }

  const now = new Date().toISOString();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("appointment_participants")
    .update({ status: "cancelled", updated_at: now })
    .eq("id", existing.id)
    .eq("status", "accepted")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("방문 확인 처리에 실패했습니다.");
  }
  if (!data) {
    redirectWithStatus(appointmentId, "already_responded");
  }

  redirectWithStatus(appointmentId, "no_show");
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

  await notifyActiveParticipants(appointmentId, appointment.restaurantName, "appointment_cancelled");

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

  await notifyActiveParticipants(appointmentId, appointment.restaurantName, "appointment_updated");

  redirectWithStatus(appointmentId, "updated");
}

/** 참여자 본인의 방문 확인(다녀왔어요). accepted 상태이며 예정 시각이 지난 뒤에만 가능하다. */
export async function confirmAttendance(appointmentId: string) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/appointments/${appointmentId}`)}`);
  }

  const appointment = await getAppointmentDetail(appointmentId);
  if (!appointment) {
    redirectWithStatus(appointmentId, "not_found");
  }
  if (appointment.status === "cancelled") {
    redirectWithStatus(appointmentId, "cancelled_appointment");
  }
  if (getAttendanceTiming(appointment.scheduledAt, new Date()) === "too_early") {
    redirectWithStatus(appointmentId, "too_early");
  }

  const existing = await getMyParticipant(appointmentId, employee.id);
  if (!existing || !canParticipantTransition(existing.status, "completed")) {
    redirectWithStatus(appointmentId, "already_responded");
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("appointment_participants")
    .update({ status: "completed", updated_at: now })
    .eq("id", existing.id)
    .eq("status", "accepted")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("방문 확인 처리에 실패했습니다.");
  }
  if (!data) {
    redirectWithStatus(appointmentId, "already_responded");
  }

  redirectWithStatus(appointmentId, "attended");
}

async function requireHostAttendancePending(appointmentId: string, employeeId: string) {
  const appointment = await getAppointmentDetail(appointmentId);
  if (!appointment) {
    redirectWithStatus(appointmentId, "not_found");
  }
  if (appointment.hostEmployeeId !== employeeId) {
    redirectWithStatus(appointmentId, "not_host");
  }
  if (appointment.status === "cancelled") {
    redirectWithStatus(appointmentId, "cancelled_appointment");
  }
  if (appointment.hostAttendanceStatus !== null) {
    redirectWithStatus(appointmentId, "already_confirmed");
  }
  return appointment;
}

/** 방장 본인의 방문 확인(다녀왔어요). 참여자 테이블에 방장 행이 없으므로 appointments 컬럼으로 관리한다. */
export async function confirmHostAttendance(appointmentId: string) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/appointments/${appointmentId}`)}`);
  }

  const appointment = await requireHostAttendancePending(appointmentId, employee.id);
  if (getAttendanceTiming(appointment.scheduledAt, new Date()) === "too_early") {
    redirectWithStatus(appointmentId, "too_early");
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("appointments")
    .update({ host_attendance_status: "completed", host_attendance_confirmed_at: now, updated_at: now })
    .eq("id", appointmentId)
    .eq("host_employee_id", employee.id)
    .is("host_attendance_status", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("방문 확인 처리에 실패했습니다.");
  }
  if (!data) {
    redirectWithStatus(appointmentId, "already_confirmed");
  }

  redirectWithStatus(appointmentId, "attended");
}

/** 방장 본인의 방문 확인(가지 않았어요). */
export async function markHostNoShow(appointmentId: string) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/appointments/${appointmentId}`)}`);
  }

  const appointment = await requireHostAttendancePending(appointmentId, employee.id);
  if (getAttendanceTiming(appointment.scheduledAt, new Date()) === "too_early") {
    redirectWithStatus(appointmentId, "too_early");
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("appointments")
    .update({ host_attendance_status: "cancelled", host_attendance_confirmed_at: now, updated_at: now })
    .eq("id", appointmentId)
    .eq("host_employee_id", employee.id)
    .is("host_attendance_status", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("방문 확인 처리에 실패했습니다.");
  }
  if (!data) {
    redirectWithStatus(appointmentId, "already_confirmed");
  }

  redirectWithStatus(appointmentId, "no_show");
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
    .select("id, name, is_active")
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

  await notifyActiveParticipants(appointmentId, restaurant.name, "appointment_updated");

  redirectWithStatus(appointmentId, "updated");
}
