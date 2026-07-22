"use server";

import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  getActiveParticipantEmployeeIds,
  getAcceptedParticipantEmployeeIds,
  createNotification,
} from "@/lib/notifications/queries";
import {
  buildAppointmentCancelledMessage,
  buildAppointmentUpdatedMessage,
  buildPollInvitedMessage,
  buildSettlementCreatedMessage,
  buildSettlementUpdatedMessage,
} from "@/lib/notifications/validation";
import { getAppointmentDetail, getMyParticipant } from "@/lib/appointments/queries";
import { canAcceptPublicApplicant, canParticipantTransition, memoSchema, parseSeoulDateTimeLocal } from "@/lib/appointments/validation";
import { getAttendanceTiming } from "@/lib/appointments/attendance";
import { closeOpenPollsForAppointment } from "@/lib/polls/queries";
import { MAX_POLL_OPTIONS, dedupeIds, sanitizeCustomLabels } from "@/lib/polls/validation";
import { calculateSettlementShares, settlementInputSchema } from "@/lib/settlements/validation";
import { getAttendeesForAppointment, upsertSettlement } from "@/lib/settlements/queries";
import {
  buildPublicAppointmentApplicationAcceptedMessage,
  buildPublicAppointmentApplicationDeclinedMessage,
  buildPublicAppointmentApplicationMessage,
} from "@/lib/notifications/validation";

function redirectWithStatus(appointmentId: string, status: string): never {
  redirect(`/appointments/${appointmentId}?status=${status}`);
}

function redirectWithSettlementStatus(appointmentId: string, status: string): never {
  redirect(`/appointments/${appointmentId}?settlementStatus=${status}`);
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
  if (appointment.isPublic) {
    redirectWithStatus(appointmentId, "public_appointment_only");
  }
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

export async function applyToPublicAppointment(appointmentId: string) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/appointments/${appointmentId}`)}`);
  }

  const appointment = await requireOpenAppointment(appointmentId);
  if (!appointment.isPublic || appointment.capacity === null) {
    redirectWithStatus(appointmentId, "public_appointment_only");
  }
  if (appointment.hostEmployeeId === employee.id) {
    redirectWithStatus(appointmentId, "not_host");
  }

  const supabase = createServiceRoleClient();
  const existing = await getMyParticipant(appointmentId, employee.id);
  if (existing) {
    redirectWithStatus(appointmentId, "already_applied");
  }

  const { count } = await supabase
    .from("appointment_participants")
    .select("*", { count: "exact", head: true })
    .eq("appointment_id", appointmentId)
    .eq("status", "accepted");
  if (!canAcceptPublicApplicant({ capacity: appointment.capacity, acceptedParticipantCount: count ?? 0 })) {
    redirectWithStatus(appointmentId, "capacity_reached");
  }

  const { error } = await supabase.from("appointment_participants").insert({
    appointment_id: appointmentId,
    employee_id: employee.id,
    status: "pending",
  });
  if (error) {
    if (error.code === "23505") {
      redirectWithStatus(appointmentId, "already_applied");
    }
    throw new Error("참여 신청에 실패했습니다.");
  }

  await createNotification({
    employeeId: appointment.hostEmployeeId,
    type: "appointment_applied",
    message: buildPublicAppointmentApplicationMessage(appointment.restaurantName),
    relatedAppointmentId: appointmentId,
  });
  redirectWithStatus(appointmentId, "application_submitted");
}

export async function decidePublicApplicant(
  appointmentId: string,
  participantId: string,
  decision: "accepted" | "declined"
) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/appointments/${appointmentId}`)}`);
  }

  const appointment = await requireOpenAppointment(appointmentId);
  if (!appointment.isPublic) {
    redirectWithStatus(appointmentId, "public_appointment_only");
  }
  if (appointment.hostEmployeeId !== employee.id) {
    redirectWithStatus(appointmentId, "not_host");
  }

  const supabase = createServiceRoleClient();
  const { data: participant } = await supabase
    .from("appointment_participants")
    .select("id, employee_id")
    .eq("id", participantId)
    .eq("appointment_id", appointmentId)
    .eq("status", "pending")
    .maybeSingle();
  if (!participant) {
    redirectWithStatus(appointmentId, "already_responded");
  }

  if (decision === "accepted") {
    const { data: approved, error } = await supabase.rpc("approve_public_appointment_applicant", {
      p_appointment_id: appointmentId,
      p_participant_id: participantId,
    });
    if (error) {
      throw new Error("참여 승인에 실패했습니다.");
    }
    if (!approved) {
      redirectWithStatus(appointmentId, "capacity_reached");
    }
  } else {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("appointment_participants")
      .update({ status: "declined", responded_at: now, updated_at: now })
      .eq("id", participantId)
      .eq("appointment_id", appointmentId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (error) {
      throw new Error("참여 신청 처리에 실패했습니다.");
    }
    if (!data) {
      redirectWithStatus(appointmentId, "already_responded");
    }
  }

  await createNotification({
    employeeId: participant.employee_id,
    type: decision === "accepted" ? "appointment_application_accepted" : "appointment_application_declined",
    message:
      decision === "accepted"
        ? buildPublicAppointmentApplicationAcceptedMessage(appointment.restaurantName)
        : buildPublicAppointmentApplicationDeclinedMessage(appointment.restaurantName),
    relatedAppointmentId: appointmentId,
  });
  redirectWithStatus(appointmentId, "applicant_decided");
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

  await closeOpenPollsForAppointment(appointmentId);
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

  // 식당이 바뀌면 이전 식당 메뉴 기준으로 만들어둔 메뉴 투표는 더 이상 유효하지 않다.
  await closeOpenPollsForAppointment(appointmentId);
  await notifyActiveParticipants(appointmentId, restaurant.name, "appointment_updated");

  redirectWithStatus(appointmentId, "updated");
}

/** 방장이 약속에 메뉴 투표를 연결한다. 수락한 참여자만 투표 가능(폴 조회/투표 액션에서 재검증). */
export async function createAppointmentMenuPoll(appointmentId: string, formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/appointments/${appointmentId}`)}`);
  }

  const appointment = await requireOpenAppointment(appointmentId);
  if (appointment.hostEmployeeId !== employee.id) {
    redirectWithStatus(appointmentId, "not_host");
  }

  const closesAt = parseSeoulDateTimeLocal(String(formData.get("closesAt") ?? ""));
  if (!closesAt || closesAt.getTime() <= Date.now()) {
    redirectWithStatus(appointmentId, "invalid_poll_closes_at");
  }

  const supabase = createServiceRoleClient();
  const menuItemIds = dedupeIds(formData.getAll("menuItemIds"));
  const customLabels = sanitizeCustomLabels(formData.getAll("customLabels"));
  const totalCount = menuItemIds.length + customLabels.length;

  if (totalCount === 0) {
    redirectWithStatus(appointmentId, "too_few_poll_options");
  }
  if (totalCount > MAX_POLL_OPTIONS) {
    redirectWithStatus(appointmentId, "too_many_poll_options");
  }

  let validMenuItemIds: string[] = [];
  if (menuItemIds.length > 0) {
    const { data: menuItems } = await supabase
      .from("menu_items")
      .select("id")
      .in("id", menuItemIds)
      .eq("restaurant_id", appointment.restaurantId);

    validMenuItemIds = (menuItems ?? []).map((m) => m.id);
    if (validMenuItemIds.length !== menuItemIds.length) {
      redirectWithStatus(appointmentId, "invalid_poll_option");
    }
  }

  const { data: poll, error } = await supabase
    .from("polls")
    .insert({
      created_by: employee.id,
      poll_type: "menu",
      restaurant_id: appointment.restaurantId,
      appointment_id: appointmentId,
      closes_at: closesAt.toISOString(),
    })
    .select("id")
    .single();

  if (error || !poll) {
    throw new Error("투표 생성에 실패했습니다.");
  }

  let position = 0;
  const optionRows = [
    ...validMenuItemIds.map((id) => ({ poll_id: poll.id, menu_item_id: id, position: position++ })),
    ...customLabels.map((label) => ({ poll_id: poll.id, custom_label: label, position: position++ })),
  ];

  const { error: optionsError } = await supabase.from("poll_options").insert(optionRows);
  if (optionsError) {
    throw new Error("투표 생성에 실패했습니다.");
  }

  const participantIds = await getAcceptedParticipantEmployeeIds(appointmentId);
  const message = buildPollInvitedMessage(appointment.restaurantName);
  await Promise.all(
    participantIds.map((employeeId) =>
      createNotification({
        employeeId,
        type: "poll_invited",
        message,
        relatedAppointmentId: appointmentId,
      })
    )
  );

  redirectWithStatus(appointmentId, "poll_created");
}

/**
 * N빵 정산 등록/수정. 실제 참석자(방문 확인 완료자)만 등록할 수 있고, 결제자도 실제 참석자 중에서만 고를 수 있다.
 * 약속당 정산은 하나만 유지하며, 다시 저장하면 기존 정산을 덮어쓴다.
 */
export async function upsertSettlementAction(appointmentId: string, formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/appointments/${appointmentId}`)}`);
  }

  const appointment = await getAppointmentDetail(appointmentId);
  if (!appointment) {
    redirectWithSettlementStatus(appointmentId, "not_found");
  }

  const attendees = await getAttendeesForAppointment(appointmentId);
  if (attendees.length === 0) {
    redirectWithSettlementStatus(appointmentId, "no_attendees");
  }
  if (!attendees.some((a) => a.employeeId === employee.id)) {
    redirectWithSettlementStatus(appointmentId, "not_attendee");
  }

  const parsed = settlementInputSchema.safeParse({
    payerEmployeeId: formData.get("payerEmployeeId"),
    totalAmount: formData.get("totalAmount"),
    roundingUnit: formData.get("roundingUnit"),
  });
  if (!parsed.success) {
    redirectWithSettlementStatus(appointmentId, "invalid_input");
  }

  if (!attendees.some((a) => a.employeeId === parsed.data.payerEmployeeId)) {
    redirectWithSettlementStatus(appointmentId, "invalid_payer");
  }

  const shares = calculateSettlementShares({
    totalAmount: parsed.data.totalAmount,
    participantIds: attendees.map((a) => a.employeeId),
    payerEmployeeId: parsed.data.payerEmployeeId,
    roundingUnit: parsed.data.roundingUnit,
  });

  const { isNew } = await upsertSettlement({
    appointmentId,
    createdBy: employee.id,
    payerEmployeeId: parsed.data.payerEmployeeId,
    totalAmount: parsed.data.totalAmount,
    roundingUnit: parsed.data.roundingUnit,
    shares,
  });

  const message = isNew
    ? buildSettlementCreatedMessage(appointment.restaurantName)
    : buildSettlementUpdatedMessage(appointment.restaurantName);
  const recipientIds = attendees.map((a) => a.employeeId).filter((id) => id !== employee.id);
  await Promise.all(
    recipientIds.map((employeeId) =>
      createNotification({
        employeeId,
        type: isNew ? "settlement_created" : "settlement_updated",
        message,
        relatedAppointmentId: appointmentId,
      })
    )
  );

  redirectWithSettlementStatus(appointmentId, "saved");
}
