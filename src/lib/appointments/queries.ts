import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isPastConfirmationWindow } from "@/lib/confirmation-window";
import { getSeoulDateString } from "@/lib/visits/validation";
import { canAcceptPublicApplicant, type AppointmentStatus, type HostAttendanceStatus, type ParticipantStatus } from "./validation";

export interface AppointmentDetail {
  id: string;
  hostEmployeeId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantCategory: string;
  scheduledAt: string;
  memo: string | null;
  status: AppointmentStatus;
  hostAttendanceStatus: HostAttendanceStatus | null;
  isPublic: boolean;
  capacity: number | null;
}

export async function getAppointmentDetail(appointmentId: string): Promise<AppointmentDetail | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("appointments")
    .select(
      "id, host_employee_id, restaurant_id, scheduled_at, memo, status, host_attendance_status, is_public, capacity, restaurants(name, category)"
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const restaurant = data.restaurants as unknown as { name: string; category: string } | null;
  if (!restaurant) {
    return null;
  }

  return {
    id: data.id,
    hostEmployeeId: data.host_employee_id,
    restaurantId: data.restaurant_id,
    restaurantName: restaurant.name,
    restaurantCategory: restaurant.category,
    scheduledAt: data.scheduled_at,
    memo: data.memo,
    status: data.status as AppointmentStatus,
    hostAttendanceStatus: data.host_attendance_status as HostAttendanceStatus | null,
    isPublic: data.is_public,
    capacity: data.capacity,
  };
}

export interface PublicRecruitingAppointment {
  id: string;
  restaurantName: string;
  scheduledAt: string;
  capacity: number;
  acceptedParticipantCount: number;
}

export async function getPublicRecruitingAppointments(
  employeeId: string,
  now: Date
): Promise<PublicRecruitingAppointment[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("appointments")
    .select("id, host_employee_id, scheduled_at, capacity, restaurants(name), appointment_participants(employee_id, status)")
    .eq("is_public", true)
    .eq("status", "active")
    .gt("scheduled_at", now.toISOString())
    .order("scheduled_at");

  return (data ?? []).flatMap((appointment) => {
    const restaurant = appointment.restaurants as unknown as { name: string } | null;
    const participants = appointment.appointment_participants as unknown as {
      employee_id: string;
      status: ParticipantStatus;
    }[];
    const capacity = appointment.capacity;
    const acceptedParticipantCount = participants.filter((participant) => participant.status === "accepted").length;
    if (
      !restaurant ||
      capacity === null ||
      appointment.host_employee_id === employeeId ||
      participants.some((participant) => participant.employee_id === employeeId) ||
      !canAcceptPublicApplicant({ capacity, acceptedParticipantCount })
    ) {
      return [];
    }

    return [{ id: appointment.id, restaurantName: restaurant.name, scheduledAt: appointment.scheduled_at, capacity, acceptedParticipantCount }];
  });
}

export interface ParticipantRow {
  id: string;
  employeeId: string;
  employeeNickname: string;
  status: ParticipantStatus;
}

export async function getParticipants(appointmentId: string): Promise<ParticipantRow[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("appointment_participants")
    .select("id, employee_id, status, employees(nickname)")
    .eq("appointment_id", appointmentId)
    .order("created_at");

  return (data ?? []).map((row) => {
    const employee = row.employees as unknown as { nickname: string } | null;
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeNickname: employee?.nickname ?? "(알 수 없음)",
      status: row.status as ParticipantStatus,
    };
  });
}

export interface MyParticipant {
  id: string;
  status: ParticipantStatus;
}

export async function getMyParticipant(
  appointmentId: string,
  employeeId: string
): Promise<MyParticipant | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("appointment_participants")
    .select("id, status")
    .eq("appointment_id", appointmentId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  return data ? { id: data.id, status: data.status as ParticipantStatus } : null;
}

/** 닉네임 목록을 정확히 일치하는 활성 직원으로 해석한다(자기 자신은 제외). */
export async function resolveEmployeesByNickname(
  nicknames: string[],
  excludeEmployeeId: string
): Promise<{ id: string; nickname: string }[]> {
  if (nicknames.length === 0) {
    return [];
  }

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("employees")
    .select("id, nickname")
    .in("nickname", nicknames)
    .eq("is_active", true);

  return (data ?? []).filter((e) => e.id !== excludeEmployeeId);
}

export interface RelevantAppointment {
  id: string;
  restaurantName: string;
  scheduledAt: string;
  role: "host" | "participant";
  participantStatus: ParticipantStatus | null;
  needsConfirmation: boolean;
}

/**
 * 응답하지 않은 채 약속 예정 시각이 지난 초대(pending)를 expired(응답 없음)로 지연 반영한다.
 * 화면에서는 이미 이런 초대를 숨겨왔지만(scheduledAt < now 체크), DB에 pending으로 영구히
 * 쌓이는 것을 막기 위해 조회 시점마다 정리한다. 실패해도 화면 노출 로직(아래 continue 체크)이
 * 그대로 걸러주므로 사용자에게 보이는 동작은 달라지지 않는다.
 */
async function expireStalePendingParticipants(employeeId: string, now: Date): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: pendingRows } = await supabase
    .from("appointment_participants")
    .select("id, appointment_id")
    .eq("employee_id", employeeId)
    .eq("status", "pending");

  if (!pendingRows || pendingRows.length === 0) {
    return;
  }

  const { data: staleAppointments } = await supabase
    .from("appointments")
    .select("id")
    .in(
      "id",
      pendingRows.map((p) => p.appointment_id)
    )
    .eq("status", "active")
    .lt("scheduled_at", now.toISOString());

  const staleAppointmentIds = new Set((staleAppointments ?? []).map((a) => a.id));
  const staleParticipantIds = pendingRows
    .filter((p) => staleAppointmentIds.has(p.appointment_id))
    .map((p) => p.id);

  if (staleParticipantIds.length === 0) {
    return;
  }

  await supabase
    .from("appointment_participants")
    .update({ status: "expired", responded_at: now.toISOString() })
    .in("id", staleParticipantIds)
    .eq("status", "pending");
}

/**
 * 홈 화면에 보여줄 약속: 내가 방장이며 아직 방문 확인 전이거나, 대기/확정 상태로 참여 중인 약속.
 * needsConfirmation이 true면 "방문 확인" 섹션에, false면 "다가오는 약속"에 사용한다.
 */
export async function getRelevantAppointments(
  employeeId: string,
  now: Date
): Promise<RelevantAppointment[]> {
  const supabase = createServiceRoleClient();

  await expireStalePendingParticipants(employeeId, now);

  const [{ data: hosted }, { data: participantRows }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, scheduled_at, host_attendance_status, restaurants(name)")
      .eq("host_employee_id", employeeId)
      .eq("status", "active")
      .is("host_attendance_status", null)
      .order("scheduled_at"),
    supabase
      .from("appointment_participants")
      .select("status, appointments(id, scheduled_at, status, restaurants(name))")
      .eq("employee_id", employeeId)
      .in("status", ["pending", "accepted"]),
  ]);

  const results: RelevantAppointment[] = [];

  for (const a of hosted ?? []) {
    const restaurant = a.restaurants as unknown as { name: string } | null;
    if (!restaurant) {
      continue;
    }
    results.push({
      id: a.id,
      restaurantName: restaurant.name,
      scheduledAt: a.scheduled_at,
      role: "host",
      participantStatus: null,
      needsConfirmation: isPastConfirmationWindow(new Date(a.scheduled_at), now),
    });
  }

  for (const p of participantRows ?? []) {
    const appt = p.appointments as unknown as {
      id: string;
      scheduled_at: string;
      status: string;
      restaurants: { name: string } | null;
    } | null;

    if (!appt || appt.status !== "active" || !appt.restaurants) {
      continue;
    }

    const scheduledAt = new Date(appt.scheduled_at);

    if (p.status === "pending" && scheduledAt < now) {
      // 응답하지 않은 채 이미 지난 초대는 더 이상 노출하지 않는다(응답 자체가 의미 없어짐).
      continue;
    }

    results.push({
      id: appt.id,
      restaurantName: appt.restaurants.name,
      scheduledAt: appt.scheduled_at,
      role: "participant",
      participantStatus: p.status as ParticipantStatus,
      needsConfirmation: p.status === "accepted" && isPastConfirmationWindow(scheduledAt, now),
    });
  }

  results.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  return results;
}

export interface AttendedAppointment {
  restaurantId: string;
  visitDate: string;
}

/** 추천 엔진의 최근 방문 감점용: sinceDate(YYYY-MM-DD) 이후 방문 확인(다녀왔어요) 완료한 약속(방장+참여자). */
export async function getRecentAttendedAppointments(
  employeeId: string,
  sinceDate: string
): Promise<AttendedAppointment[]> {
  const supabase = createServiceRoleClient();

  const [{ data: hosted }, { data: participantRows }] = await Promise.all([
    supabase
      .from("appointments")
      .select("restaurant_id, scheduled_at")
      .eq("host_employee_id", employeeId)
      .eq("host_attendance_status", "completed"),
    supabase
      .from("appointment_participants")
      .select("appointments(restaurant_id, scheduled_at)")
      .eq("employee_id", employeeId)
      .eq("status", "completed"),
  ]);

  const results: AttendedAppointment[] = [];

  for (const a of hosted ?? []) {
    const visitDate = getSeoulDateString(new Date(a.scheduled_at));
    if (visitDate >= sinceDate) {
      results.push({ restaurantId: a.restaurant_id, visitDate });
    }
  }

  for (const p of participantRows ?? []) {
    const appt = p.appointments as unknown as { restaurant_id: string; scheduled_at: string } | null;
    if (!appt) {
      continue;
    }
    const visitDate = getSeoulDateString(new Date(appt.scheduled_at));
    if (visitDate >= sinceDate) {
      results.push({ restaurantId: appt.restaurant_id, visitDate });
    }
  }

  return results;
}
